import {
  WorkoutRoutine,
  Exercise,
  ActiveWorkoutSession,
  WorkoutLog,
  BodyMeasurement,
  UserSettings,
  PersonalRecord,
  UserAccount,
  AuthSession,
} from '../types';
import { DEFAULT_EXERCISES, DEFAULT_ROUTINES, DEFAULT_SETTINGS } from './defaultData';
import { verifyValue } from '../utils/security';
import { normalizeDate } from '../utils/formatters';

const DB_NAME = 'HyperPulse_Gym_DB';
const DB_VERSION = 2;

const STORES = {
  ROUTINES: 'routines',
  EXERCISES: 'exercises',
  SESSIONS: 'sessions',
  ACTIVE_SESSION: 'active_session',
  MEASUREMENTS: 'measurements',
  SETTINGS: 'settings',
  SYNC_QUEUE: 'sync_queue',
  ACCOUNTS: 'accounts',
  AUTH: 'auth_session',
} as const;

export type StorageMutationType =
  | 'routine'
  | 'routine_delete'
  | 'log'
  | 'measurement'
  | 'settings'
  | 'active_session';

type StorageMutationListener = (type: StorageMutationType, payload: any) => void;
const mutationListeners: StorageMutationListener[] = [];

export function onStorageMutation(listener: StorageMutationListener): () => void {
  mutationListeners.push(listener);
  return () => {
    const idx = mutationListeners.indexOf(listener);
    if (idx >= 0) mutationListeners.splice(idx, 1);
  };
}

export function notifyMutation(type: StorageMutationType, payload: any) {
  mutationListeners.forEach((l) => {
    try {
      l(type, payload);
    } catch (e) {
      console.warn('Storage mutation listener error', e);
    }
  });
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORES.ROUTINES)) {
        db.createObjectStore(STORES.ROUTINES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.EXERCISES)) {
        db.createObjectStore(STORES.EXERCISES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const store = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('routineId', 'routineId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.ACTIVE_SESSION)) {
        db.createObjectStore(STORES.ACTIVE_SESSION, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.MEASUREMENTS)) {
        const store = db.createObjectStore(STORES.MEASUREMENTS, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.ACCOUNTS)) {
        const store = db.createObjectStore(STORES.ACCOUNTS, { keyPath: 'id' });
        store.createIndex('email', 'email', { unique: true });
      }
      if (!db.objectStoreNames.contains(STORES.AUTH)) {
        db.createObjectStore(STORES.AUTH, { keyPath: 'key' });
      }
    };
  });
}

// Generic transaction helper
async function performTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest | void
): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let requestResult: any;

      try {
        const req = callback(store);
        if (req) {
          req.onsuccess = () => {
            requestResult = req.result;
          };
          req.onerror = () => {
            reject(req.error);
          };
        }
      } catch (err) {
        reject(err);
      }

      tx.oncomplete = () => {
        resolve(requestResult);
      };
      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch (err) {
    // LocalStorage fallback for strictly sandboxed environments
    console.warn(`IndexedDB unavailable for ${storeName}, falling back to localStorage`, err);
    return fallbackStorage(storeName, mode, callback);
  }
}

// Fallback using LocalStorage
function fallbackStorage<T>(storeName: string, mode: IDBTransactionMode, _cb: any): T {
  const key = `hp_fallback_${storeName}`;
  const raw = localStorage.getItem(key);
  return (raw ? JSON.parse(raw) : null) as T;
}

// ==================== ROUTINES ====================

export const LEGACY_ROUTINE_IDS = new Set([
  'routine_domingo',
  'routine_segunda',
  'routine_terca',
  'routine_quarta',
  'routine_quinta',
  'routine_sexta',
  'routine_sabado',
  'routine_0',
  'routine_1',
  'routine_2',
  'routine_3',
  'routine_4',
  'routine_5',
  'routine_6',
  'routine_seg',
  'routine_ter',
  'routine_qua',
  'routine_qui',
  'routine_sex',
  'routine_sab',
  'routine_dom',
]);

/**
 * Identifies old/legacy placeholder routines that were replaced by the official
 * Smart Fit hypertrophy sheet, preventing duplicates on user devices.
 */
export function isLegacyRoutine(routine?: {
  id: string;
  name?: string;
  totalPlannedSets?: number;
  estimatedMinutes?: string;
}): boolean {
  if (!routine || !routine.id) return false;

  // Explicit match against known legacy routine IDs
  if (LEGACY_ROUTINE_IDS.has(routine.id)) return true;

  // Custom user-created routines start with custom_routine_ or routine_copy_
  const isCustom = routine.id.startsWith('custom_routine_') || routine.id.startsWith('routine_copy_');
  if (isCustom) return false;

  // Official routines all start with routine_smartfit_
  if (!routine.id.startsWith('routine_smartfit_')) {
    return true;
  }

  // Legacy signatures (old names or old set totals like 14 on Sunday, 15 on Tuesday/Thursday)
  if (
    routine.name === 'Quinta: Treino de Membros Superiores' ||
    routine.name === 'Terça: Pernas com foco em Quadríceps' ||
    (routine.name?.includes('Posteriores') && routine.totalPlannedSets === 14) ||
    (routine.name?.includes('Pernas') && routine.totalPlannedSets === 15) ||
    (routine.name?.includes('Superiores') && routine.totalPlannedSets === 15) ||
    routine.estimatedMinutes === '60-75 min'
  ) {
    return true;
  }

  return false;
}

export async function getRoutines(): Promise<WorkoutRoutine[]> {
  try {
    const existing = await performTx<WorkoutRoutine[]>(STORES.ROUTINES, 'readonly', (store) =>
      store.getAll()
    );

    if (existing && existing.length > 0) {
      // 1. Identify and purge any legacy routine IDs from IndexedDB
      const legacyFound = existing.filter((r) => isLegacyRoutine(r));
      if (legacyFound.length > 0) {
        try {
          const db = await openDB();
          const tx = db.transaction(STORES.ROUTINES, 'readwrite');
          const store = tx.objectStore(STORES.ROUTINES);
          legacyFound.forEach((leg) => store.delete(leg.id));
          await new Promise<void>((resolve) => {
            tx.oncomplete = () => resolve();
          });
        } catch (delErr) {
          console.warn('Error purging legacy routines from IndexedDB:', delErr);
        }
      }

      // 2. Filter out legacy routines
      const nonLegacy = existing.filter((r) => !isLegacyRoutine(r));

      // 3. Ensure all 7 official Smart Fit routines exist
      const existingSmartFitIds = new Set(nonLegacy.map((r) => r.id));
      const missingSmartFit = DEFAULT_ROUTINES.filter((r) => !existingSmartFitIds.has(r.id));

      if (missingSmartFit.length > 0) {
        try {
          const db = await openDB();
          const tx = db.transaction(STORES.ROUTINES, 'readwrite');
          const store = tx.objectStore(STORES.ROUTINES);
          missingSmartFit.forEach((r) => store.put(r));
          await new Promise<void>((resolve) => {
            tx.oncomplete = () => resolve();
          });
          nonLegacy.push(...missingSmartFit);
        } catch (putErr) {
          console.warn('Error seeding missing Smart Fit routines:', putErr);
        }
      }

      // 4. Final deduplication: keep only 1 official routine per day of week, plus any custom user routines
      const deduplicated: WorkoutRoutine[] = [];
      const seenKeys = new Set<string>();

      for (const r of nonLegacy) {
        // Unique key: official routines by dayOfWeek, custom routines by id
        const key = r.id.startsWith('routine_smartfit_') ? `sf_day_${r.dayOfWeek}` : r.id;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          deduplicated.push(r);
        } else {
          // Stale duplicate: delete from IndexedDB
          try {
            await performTx(STORES.ROUTINES, 'readwrite', (s) => s.delete(r.id));
          } catch {
            // Ignore deletion error
          }
        }
      }

      return deduplicated.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    }
  } catch (e) {
    console.warn('Error fetching routines, ensuring defaults', e);
  }

  // Seed default routines if empty
  await saveRoutines(DEFAULT_ROUTINES);
  return DEFAULT_ROUTINES;
}

export async function saveRoutines(routines: WorkoutRoutine[]): Promise<void> {
  const cleanRoutines = routines.filter((r) => !isLegacyRoutine(r));
  const db = await openDB();
  const tx = db.transaction(STORES.ROUTINES, 'readwrite');
  const store = tx.objectStore(STORES.ROUTINES);
  cleanRoutines.forEach((r) => store.put(r));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveRoutine(routine: WorkoutRoutine): Promise<void> {
  await performTx(STORES.ROUTINES, 'readwrite', (store) => store.put(routine));
  notifyMutation('routine', routine);
}

export async function deleteRoutine(id: string): Promise<void> {
  await performTx(STORES.ROUTINES, 'readwrite', (store) => store.delete(id));
  notifyMutation('routine_delete', { id });
}

// ==================== EXERCISES ====================
export async function getExercises(): Promise<Exercise[]> {
  try {
    const existing = await performTx<Exercise[]>(STORES.EXERCISES, 'readonly', (store) =>
      store.getAll()
    );

    if (existing && existing.length > 0) {
      // Ensure all Smart Fit exercises are present without overwriting custom ones
      const existingIds = new Set(existing.map((e) => e.id));
      const missingDefaults = DEFAULT_EXERCISES.filter((e) => !existingIds.has(e.id));

      if (missingDefaults.length > 0) {
        const db = await openDB();
        const tx = db.transaction(STORES.EXERCISES, 'readwrite');
        const store = tx.objectStore(STORES.EXERCISES);
        missingDefaults.forEach((ex) => store.put(ex));
        await new Promise<void>((resolve) => {
          tx.oncomplete = () => resolve();
        });
        return [...existing, ...missingDefaults];
      }

      return existing;
    }
  } catch (e) {
    console.warn('Error fetching exercises', e);
  }

  // Seed default exercises
  const db = await openDB();
  const tx = db.transaction(STORES.EXERCISES, 'readwrite');
  const store = tx.objectStore(STORES.EXERCISES);
  DEFAULT_EXERCISES.forEach((ex) => store.put(ex));
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
  });
  return DEFAULT_EXERCISES;
}

export async function saveExercise(exercise: Exercise): Promise<void> {
  await performTx(STORES.EXERCISES, 'readwrite', (store) => store.put(exercise));
}

export async function deleteExercise(id: string): Promise<void> {
  await performTx(STORES.EXERCISES, 'readwrite', (store) => store.delete(id));
}

// ==================== ACTIVE SESSION ====================
export async function getActiveSession(): Promise<ActiveWorkoutSession | null> {
  try {
    const session = await performTx<ActiveWorkoutSession>(
      STORES.ACTIVE_SESSION,
      'readonly',
      (store) => store.get('current')
    );
    return session || null;
  } catch (e) {
    // Fallback check
    const raw = localStorage.getItem('hp_active_session');
    return raw ? JSON.parse(raw) : null;
  }
}

export async function saveActiveSession(session: ActiveWorkoutSession | null): Promise<void> {
  try {
    if (!session) {
      localStorage.removeItem('hp_active_session');
      await performTx(STORES.ACTIVE_SESSION, 'readwrite', (store) => store.delete('current'));
    } else {
      const sessionWithKey = { ...session, id: 'current' };
      localStorage.setItem('hp_active_session', JSON.stringify(sessionWithKey));
      await performTx(STORES.ACTIVE_SESSION, 'readwrite', (store) => store.put(sessionWithKey));
    }
  } catch (e) {
    if (!session) {
      localStorage.removeItem('hp_active_session');
    } else {
      localStorage.setItem('hp_active_session', JSON.stringify({ ...session, id: 'current' }));
    }
  }
  notifyMutation('active_session', session);
}

// ==================== WORKOUT LOGS ====================
export async function getWorkoutLogs(): Promise<WorkoutLog[]> {
  try {
    const logs = await performTx<WorkoutLog[]>(STORES.SESSIONS, 'readonly', (store) => store.getAll());
    if (logs) {
      return logs
        .map((log) => ({ ...log, date: normalizeDate(log.date) }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  } catch (e) {
    console.warn('Error fetching logs', e);
  }
  return [];
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  const normalized: WorkoutLog = { ...log, date: normalizeDate(log.date) };
  await performTx(STORES.SESSIONS, 'readwrite', (store) => store.put(normalized));
  notifyMutation('log', normalized);
}

export async function deleteWorkoutLog(id: string): Promise<void> {
  await performTx(STORES.SESSIONS, 'readwrite', (store) => store.delete(id));
}

// ==================== MEASUREMENTS ====================
export async function getBodyMeasurements(): Promise<BodyMeasurement[]> {
  try {
    const measurements = await performTx<BodyMeasurement[]>(
      STORES.MEASUREMENTS,
      'readonly',
      (store) => store.getAll()
    );
    if (measurements) {
      return measurements
        .map((m) => ({ ...m, date: normalizeDate(m.date) }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  } catch (e) {
    console.warn('Error fetching measurements', e);
  }
  return [];
}

export async function saveBodyMeasurement(measurement: BodyMeasurement): Promise<void> {
  const normalized: BodyMeasurement = { ...measurement, date: normalizeDate(measurement.date) };
  await performTx(STORES.MEASUREMENTS, 'readwrite', (store) => store.put(normalized));
  notifyMutation('measurement', normalized);
}

export async function deleteBodyMeasurement(id: string): Promise<void> {
  await performTx(STORES.MEASUREMENTS, 'readwrite', (store) => store.delete(id));
}

// ==================== SETTINGS ====================
export async function getSettings(): Promise<UserSettings> {
  try {
    const res = await performTx<{ key: string; value: UserSettings }>(
      STORES.SETTINGS,
      'readonly',
      (store) => store.get('user_settings')
    );
    if (res && res.value) {
      return { ...DEFAULT_SETTINGS, ...res.value };
    }
  } catch (e) {
    const raw = localStorage.getItem('hp_settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    localStorage.setItem('hp_settings', JSON.stringify(settings));
    await performTx(STORES.SETTINGS, 'readwrite', (store) =>
      store.put({ key: 'user_settings', value: settings })
    );
  } catch (e) {
    localStorage.setItem('hp_settings', JSON.stringify(settings));
  }
  notifyMutation('settings', settings);
}

// ==================== PERSONAL RECORDS (PRs) ====================
export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  const logs = await getWorkoutLogs();
  const prMap = new Map<string, PersonalRecord>();

  for (const log of logs) {
    for (const ex of log.exercises) {
      let exerciseSessionVolume = 0;
      let sessionMaxWeight = 0;

      for (const set of ex.completedSets) {
        if (set.weightKg > sessionMaxWeight) {
          sessionMaxWeight = set.weightKg;
        }
        exerciseSessionVolume += set.weightKg * set.reps;
      }

      const existing = prMap.get(ex.exerciseId);
      if (!existing) {
        prMap.set(ex.exerciseId, {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          maxWeightKg: sessionMaxWeight,
          maxVolumeSessionKg: exerciseSessionVolume,
          dateAchieved: log.date,
        });
      } else {
        let updated = false;
        if (sessionMaxWeight > existing.maxWeightKg) {
          existing.maxWeightKg = sessionMaxWeight;
          existing.dateAchieved = log.date;
          updated = true;
        }
        if (exerciseSessionVolume > existing.maxVolumeSessionKg) {
          existing.maxVolumeSessionKg = exerciseSessionVolume;
          updated = true;
        }
        if (updated) {
          prMap.set(ex.exerciseId, existing);
        }
      }
    }
  }

  return Array.from(prMap.values());
}

// ==================== BACKUP & EXPORT ====================
export async function exportAllData(): Promise<string> {
  const [routines, exercises, logs, measurements, settings] = await Promise.all([
    getRoutines(),
    getExercises(),
    getWorkoutLogs(),
    getBodyMeasurements(),
    getSettings(),
  ]);

  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    routines,
    exercises,
    logs,
    measurements,
    settings,
  };

  return JSON.stringify(exportPayload, null, 2);
}

export async function exportLogsCSV(): Promise<string> {
  const logs = await getWorkoutLogs();
  const rows: string[] = [];
  rows.push('Data,Treino,Exercício,Grupo Muscular,Série,Carga (kg),Repetições,Volume Série (kg)');

  for (const log of logs) {
    const formattedDate = log.date.split('T')[0];
    for (const ex of log.exercises) {
      for (const set of ex.completedSets) {
        const volume = set.weightKg * set.reps;
        rows.push(
          `"${formattedDate}","${log.routineName.replace(/"/g, '""')}","${ex.exerciseName.replace(/"/g, '""')}","${ex.targetMuscleGroup}","${set.setNumber}","${set.weightKg}","${set.reps}","${volume}"`
        );
      }
    }
  }

  return rows.join('\n');
}

export async function importData(jsonContent: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonContent);
    if (!data.routines || !data.exercises) {
      throw new Error('Arquivo de backup inválido');
    }

    if (Array.isArray(data.routines)) await saveRoutines(data.routines);
    if (Array.isArray(data.exercises)) {
      for (const ex of data.exercises) await saveExercise(ex);
    }
    if (Array.isArray(data.logs)) {
      for (const log of data.logs) await saveWorkoutLog(log);
    }
    if (Array.isArray(data.measurements)) {
      for (const m of data.measurements) await saveBodyMeasurement(m);
    }
    if (data.settings) await saveSettings(data.settings);

    return true;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(
    [
      STORES.ROUTINES,
      STORES.EXERCISES,
      STORES.SESSIONS,
      STORES.ACTIVE_SESSION,
      STORES.MEASUREMENTS,
      STORES.SETTINGS,
    ],
    'readwrite'
  );

  tx.objectStore(STORES.ROUTINES).clear();
  tx.objectStore(STORES.EXERCISES).clear();
  tx.objectStore(STORES.SESSIONS).clear();
  tx.objectStore(STORES.ACTIVE_SESSION).clear();
  tx.objectStore(STORES.MEASUREMENTS).clear();
  tx.objectStore(STORES.SETTINGS).clear();

  localStorage.removeItem('hp_active_session');
  localStorage.removeItem('hp_settings');

  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

// ==================== USER ACCOUNTS & AUTH ====================
export async function getUserAccounts(): Promise<UserAccount[]> {
  try {
    const accounts = await performTx<UserAccount[]>(STORES.ACCOUNTS, 'readonly', (store) =>
      store.getAll()
    );
    if (accounts && accounts.length > 0) {
      return accounts;
    }
  } catch (e) {
    console.warn('Error fetching accounts from IndexedDB', e);
  }

  // LocalStorage fallback
  try {
    const raw = localStorage.getItem('hp_user_accounts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getUserAccountByEmail(email: string): Promise<UserAccount | null> {
  const normalized = email.trim().toLowerCase();
  const accounts = await getUserAccounts();
  return accounts.find((a) => a.email.toLowerCase() === normalized) || null;
}

export async function saveUserAccount(account: UserAccount): Promise<void> {
  try {
    const accounts = await getUserAccounts();
    const existingIdx = accounts.findIndex((a) => a.id === account.id || a.email.toLowerCase() === account.email.toLowerCase());
    if (existingIdx >= 0) {
      accounts[existingIdx] = account;
    } else {
      accounts.push(account);
    }
    localStorage.setItem('hp_user_accounts', JSON.stringify(accounts));

    await performTx(STORES.ACCOUNTS, 'readwrite', (store) => store.put(account));
  } catch (e) {
    console.warn('Fallback saving user account', e);
  }
}

export async function updateUserAccountPin(email: string, pinHash: string, pinSalt: string): Promise<boolean> {
  const account = await getUserAccountByEmail(email);
  if (!account) return false;

  account.pinHash = pinHash;
  account.pinSalt = pinSalt;
  account.updatedAt = new Date().toISOString();

  await saveUserAccount(account);
  return true;
}

export async function getActiveAuthSession(): Promise<AuthSession | null> {
  try {
    const sessionRes = await performTx<{ key: string; value: AuthSession }>(
      STORES.AUTH,
      'readonly',
      (store) => store.get('current_session')
    );
    if (sessionRes && sessionRes.value) {
      // Check if session has expired (30 days validity)
      if (sessionRes.value.expiresAt > Date.now()) {
        return sessionRes.value;
      }
    }
  } catch (e) {
    // fallback
  }

  try {
    const raw = localStorage.getItem('hp_auth_session');
    if (raw) {
      const session = JSON.parse(raw) as AuthSession;
      if (session && session.expiresAt > Date.now()) {
        return session;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function saveActiveAuthSession(session: AuthSession | null): Promise<void> {
  try {
    if (!session) {
      localStorage.removeItem('hp_auth_session');
      await performTx(STORES.AUTH, 'readwrite', (store) => store.delete('current_session'));
    } else {
      localStorage.setItem('hp_auth_session', JSON.stringify(session));
      await performTx(STORES.AUTH, 'readwrite', (store) =>
        store.put({ key: 'current_session', value: session })
      );
    }
  } catch (e) {
    if (!session) {
      localStorage.removeItem('hp_auth_session');
    } else {
      localStorage.setItem('hp_auth_session', JSON.stringify(session));
    }
  }
}

/**
 * Verify a 6-digit numeric PIN against registered accounts.
 * Returns the matching account if valid.
 */
export async function verifyPinLogin(
  pin: string
): Promise<{ success: boolean; account?: UserAccount; error?: string }> {
  const accounts = await getUserAccounts();

  if (accounts.length === 0) {
    return {
      success: false,
      error: 'Nenhuma conta cadastrada ainda no dispositivo. Crie seu cadastro para continuar.',
    };
  }

  for (const acc of accounts) {
    const isValid = await verifyValue(pin, acc.pinSalt, acc.pinHash);
    if (isValid) {
      return { success: true, account: acc };
    }
  }

  return {
    success: false,
    error: 'Código de acesso incorreto. Verifique os 6 dígitos digitados.',
  };
}
