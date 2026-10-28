import {
  WorkoutRoutine,
  Exercise,
  ActiveWorkoutSession,
  WorkoutLog,
  BodyMeasurement,
  UserSettings,
  PersonalRecord,
} from '../types';
import { DEFAULT_EXERCISES, DEFAULT_ROUTINES, DEFAULT_SETTINGS } from './defaultData';

const DB_NAME = 'HyperPulse_Gym_DB';
const DB_VERSION = 1;

const STORES = {
  ROUTINES: 'routines',
  EXERCISES: 'exercises',
  SESSIONS: 'sessions',
  ACTIVE_SESSION: 'active_session',
  MEASUREMENTS: 'measurements',
  SETTINGS: 'settings',
  SYNC_QUEUE: 'sync_queue',
} as const;

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
export async function getRoutines(): Promise<WorkoutRoutine[]> {
  try {
    const routines = await performTx<WorkoutRoutine[]>(STORES.ROUTINES, 'readonly', (store) => store.getAll());
    if (routines && routines.length > 0) {
      return routines.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    }
  } catch (e) {
    console.warn('Error fetching routines', e);
  }

  // Seed default routines
  await saveRoutines(DEFAULT_ROUTINES);
  return DEFAULT_ROUTINES;
}

export async function saveRoutines(routines: WorkoutRoutine[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.ROUTINES, 'readwrite');
  const store = tx.objectStore(STORES.ROUTINES);
  routines.forEach((r) => store.put(r));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveRoutine(routine: WorkoutRoutine): Promise<void> {
  await performTx(STORES.ROUTINES, 'readwrite', (store) => store.put(routine));
}

export async function deleteRoutine(id: string): Promise<void> {
  await performTx(STORES.ROUTINES, 'readwrite', (store) => store.delete(id));
}

// ==================== EXERCISES ====================
export async function getExercises(): Promise<Exercise[]> {
  try {
    const exercises = await performTx<Exercise[]>(STORES.EXERCISES, 'readonly', (store) => store.getAll());
    if (exercises && exercises.length > 0) {
      return exercises;
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
}

// ==================== WORKOUT LOGS ====================
export async function getWorkoutLogs(): Promise<WorkoutLog[]> {
  try {
    const logs = await performTx<WorkoutLog[]>(STORES.SESSIONS, 'readonly', (store) => store.getAll());
    if (logs) {
      return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  } catch (e) {
    console.warn('Error fetching logs', e);
  }
  return [];
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  await performTx(STORES.SESSIONS, 'readwrite', (store) => store.put(log));
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
      return measurements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  } catch (e) {
    console.warn('Error fetching measurements', e);
  }
  return [];
}

export async function saveBodyMeasurement(measurement: BodyMeasurement): Promise<void> {
  await performTx(STORES.MEASUREMENTS, 'readwrite', (store) => store.put(measurement));
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

  localStorage.clear();

  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}
