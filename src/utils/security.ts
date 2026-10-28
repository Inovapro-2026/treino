/**
 * Security & Cryptography Utilities for HyperPulse
 * - Salted SHA-256 Hashing via Web Crypto API
 * - Zero plain-text storage of PINs and Passwords
 * - Brute-force rate limiting with progressive lockout
 */

// Safe crypto getter for both browser (window.crypto) and Node environment (globalThis.crypto)
function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.subtle) {
    return (globalThis as any).crypto.subtle;
  }
  throw new Error('Web Crypto API (crypto.subtle) is not available in this environment.');
}

// Generate random hex salt
export function generateSalt(length: number = 16): string {
  const bytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else if (typeof globalThis !== 'undefined' && (globalThis as any).crypto) {
    (globalThis as any).crypto.getRandomValues(bytes);
  } else {
    // Math.random fallback for non-crypto test stubs
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Compute SHA-256 hash of a string combined with a salt
export async function hashStringWithSalt(value: string, salt: string): Promise<string> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${value}:${salt}`);
  const hashBuffer = await subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Verify a string against an expected salt and hash
export async function verifyValue(value: string, salt: string, expectedHash: string): Promise<boolean> {
  try {
    const computed = await hashStringWithSalt(value, salt);
    return computed === expectedHash;
  } catch (err) {
    console.error('Cryptographic verification error', err);
    return false;
  }
}

// Rate Limiting & Brute-Force Lockout Tracker
interface AttemptRecord {
  attempts: number;
  lastAttemptAt: number;
  lockedUntil: number;
}

const attemptStorage = new Map<string, AttemptRecord>();

export interface LockoutStatus {
  isLocked: boolean;
  waitSecondsRemaining: number;
  failedAttempts: number;
  warningMessage?: string;
}

/**
 * Check if the user is currently locked out from entering PIN
 */
export function getLockoutStatus(identifier: string = 'pin_login'): LockoutStatus {
  const record = attemptStorage.get(identifier);
  const now = Date.now();

  if (!record) {
    return { isLocked: false, waitSecondsRemaining: 0, failedAttempts: 0 };
  }

  if (record.lockedUntil > now) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      waitSecondsRemaining: remaining,
      failedAttempts: record.attempts,
      warningMessage: `Muitas tentativas incorretas. Aguarde ${remaining}s para tentar novamente.`,
    };
  }

  // If lockout expired, reset lockedUntil but retain attempt counter until a success or long idle
  return {
    isLocked: false,
    waitSecondsRemaining: 0,
    failedAttempts: record.attempts,
  };
}

/**
 * Record a failed attempt and apply progressive lockout penalty:
 * 3 failed attempts: 15 seconds
 * 4 failed attempts: 30 seconds
 * 5+ failed attempts: 60 seconds
 */
export function recordFailedAttempt(identifier: string = 'pin_login'): LockoutStatus {
  const now = Date.now();
  const current = attemptStorage.get(identifier) || {
    attempts: 0,
    lastAttemptAt: now,
    lockedUntil: 0,
  };

  current.attempts += 1;
  current.lastAttemptAt = now;

  let penaltySeconds = 0;
  if (current.attempts >= 5) {
    penaltySeconds = 60;
  } else if (current.attempts === 4) {
    penaltySeconds = 30;
  } else if (current.attempts === 3) {
    penaltySeconds = 15;
  }

  if (penaltySeconds > 0) {
    current.lockedUntil = now + penaltySeconds * 1000;
  }

  attemptStorage.set(identifier, current);

  const remaining = Math.ceil((current.lockedUntil - now) / 1000);
  return {
    isLocked: remaining > 0,
    waitSecondsRemaining: Math.max(0, remaining),
    failedAttempts: current.attempts,
    warningMessage:
      remaining > 0
        ? `Código incorreto. Limite de tentativas atingido. Aguarde ${remaining}s.`
        : `Código incorreto (${current.attempts}/3 tentativas).`,
  };
}

/**
 * Reset failed attempt record upon successful authentication
 */
export function resetFailedAttempts(identifier: string = 'pin_login'): void {
  attemptStorage.delete(identifier);
}
