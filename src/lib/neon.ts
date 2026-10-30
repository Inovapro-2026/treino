/**
 * Neon Database Client for HyperPulse Treino
 * Uses @neondatabase/serverless for direct PostgreSQL access
 * Compatible with browser environments
 */
import { neon, neonConfig } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';
import { normalizeDate } from '../utils/formatters';

// Configure Neon for browser environments.
// `fetchConnectionCache` is always enabled in current versions and setting it
// only emits a deprecation warning, so it is no longer set here.
neonConfig.disableWarningInBrowsers = true;

// Neon connection string from environment
const NEON_CONNECTION_STRING = import.meta.env.VITE_NEON_CONNECTION_STRING || 
  'postgresql://neondb_owner:npg_4meOx6FajsTz@ep-polished-pond-adv8w1re-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Create SQL client
export const sql = neon(NEON_CONNECTION_STRING);

// Create pool for transaction support
export const pool = new Pool({ connectionString: NEON_CONNECTION_STRING });

export interface NeonConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean;
  hasTables: boolean;
  currentUser: NeonUser | null;
  errorMessage?: string;
}

export interface NeonUser {
  id: string;
  email: string;
  name: string;
  pinSalt: string;
  pinHash: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeonProfile extends NeonUser {}

/**
 * Check if Neon is configured and reachable
 */
export async function checkNeonConnection(): Promise<NeonConnectionStatus> {
  if (!NEON_CONNECTION_STRING) {
    return {
      isConfigured: false,
      isConnected: false,
      hasTables: false,
      currentUser: null,
      errorMessage: 'String de conexão Neon não configurada.',
    };
  }

  try {
    // Test connection
    await sql`SELECT 1 as test`;

    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('profiles', 'user_settings', 'routines', 'exercises', 'workout_logs', 'body_measurements', 'active_sessions')
    `;

    const hasTables = tables.length >= 7;

    // Get current user from localStorage
    const userJson = localStorage.getItem('hp_neon_user');
    const currentUser = userJson ? JSON.parse(userJson) : null;

    return {
      isConfigured: true,
      isConnected: true,
      hasTables,
      currentUser,
      errorMessage: !hasTables ? 'Tabelas aguardando execução do script de migration SQL no Neon.' : undefined,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      hasTables: false,
      currentUser: null,
      errorMessage: err?.message || 'Falha ao conectar com o Neon.',
    };
  }
}

/**
 * Initialize database schema (run migrations)
 */
export async function initializeNeonSchema(): Promise<{ success: boolean; error?: string }> {
  try {
    // This will be called from SqlMigrationModal
    // The actual SQL is in the migration file
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao inicializar schema' };
  }
}

// Helper: hash PIN with salt
export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Auth functions
 */
export async function signUp(email: string, password: string, name: string): Promise<{ user: NeonUser | null; error?: string }> {
  try {
    // Check if email exists
    const existing = await sql`SELECT id FROM profiles WHERE email = ${email}`;
    if (existing.length > 0) {
      return { user: null, error: 'Email já cadastrado' };
    }

    const pinSalt = generateSalt();
    const pinHash = await hashPin(password, pinSalt);
    const userId = crypto.randomUUID();

    await sql`
      INSERT INTO profiles (id, email, name, pin_salt, pin_hash, created_at, updated_at)
      VALUES (${userId}, ${email}, ${name}, ${pinSalt}, ${pinHash}, NOW(), NOW())
    `;

    // Create default settings
    await sql`
      INSERT INTO user_settings (user_id, theme, accent_color, default_rest_seconds, sound_enabled, vibration_enabled, weight_unit, auto_start_rest, weekly_workout_goal, user_name, motivational_message, created_at, updated_at)
      VALUES (${userId}, 'dark', 'lime', 90, true, true, 'kg', true, 5, ${name}, 'Constância vence o talento. Mais uma série com técnica perfeita.', NOW(), NOW())
    `;

    // Copy default routines and exercises
    await copyDefaultData(userId);

    const user: NeonUser = {
      id: userId,
      email,
      name,
      pinSalt,
      pinHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('hp_neon_user', JSON.stringify(user));
    return { user };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Erro no cadastro' };
  }
}

export async function signIn(email: string, password: string): Promise<{ user: NeonUser | null; error?: string }> {
  try {
    const result = await sql`SELECT * FROM profiles WHERE email = ${email}`;
    if (result.length === 0) {
      return { user: null, error: 'Email ou senha inválidos' };
    }

    const profile = result[0];
    const pinHash = await hashPin(password, profile.pin_salt);
    
    if (pinHash !== profile.pin_hash) {
      return { user: null, error: 'Email ou senha inválidos' };
    }

    const user: NeonUser = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      pinSalt: profile.pin_salt,
      pinHash: profile.pin_hash,
      avatarUrl: profile.avatar_url,
      createdAt: normalizeDate(profile.created_at),
      updatedAt: normalizeDate(profile.updated_at),
    };

    localStorage.setItem('hp_neon_user', JSON.stringify(user));
    return { user };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Erro no login' };
  }
}

export function signOut(): void {
  localStorage.removeItem('hp_neon_user');
}

export function getCurrentUser(): NeonUser | null {
  const userJson = localStorage.getItem('hp_neon_user');
  return userJson ? JSON.parse(userJson) : null;
}

async function copyDefaultData(userId: string) {
  // Import default data from the existing module
  const { DEFAULT_EXERCISES, DEFAULT_ROUTINES } = await import('../db/defaultData');
  
  // Insert default exercises
  for (const ex of DEFAULT_EXERCISES) {
    await sql`
      INSERT INTO exercises (id, user_id, name, target_muscle_group, secondary_muscles, equipment, instructions, tips, is_multiarticular, is_unilateral, is_custom, is_favorite, created_at, updated_at)
      VALUES (${ex.id}, ${userId}, ${ex.name}, ${ex.targetMuscleGroup}, ${JSON.stringify(ex.secondaryMuscles || [])}, ${ex.equipment}, ${ex.instructions || ''}, ${ex.tips || ''}, ${ex.isMultiarticular || false}, ${ex.isUnilateral || false}, false, ${ex.isFavorite || false}, NOW(), NOW())
      ON CONFLICT (id, user_id) DO NOTHING
    `;
  }

  // Insert default routines
  for (const routine of DEFAULT_ROUTINES) {
    await sql`
      INSERT INTO routines (id, user_id, name, description, day_of_week, is_rest_day, color, plan_name, estimated_minutes, total_planned_sets, exercises, target_muscle_groups, created_at, updated_at)
      VALUES (${routine.id}, ${userId}, ${routine.name}, ${routine.description || ''}, ${routine.dayOfWeek}, ${routine.isRestDay}, ${routine.color}, ${routine.planName || 'Treino de Hipertrofia'}, ${routine.estimatedMinutes || ''}, ${routine.totalPlannedSets || 0}, ${JSON.stringify(routine.exercises || [])}, ${JSON.stringify(routine.targetMuscleGroups || [])}, NOW(), NOW())
      ON CONFLICT (id, user_id) DO NOTHING
    `;
  }
}