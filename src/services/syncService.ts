/**
 * Bidirectional Synchronization Service: IndexedDB <-> Neon Cloud
 * Handles real-time syncing, offline queues, conflict resolution, and data recovery
 */
import { sql, getCurrentUser, NeonUser } from '../lib/neon';
import {
  getRoutines,
  saveRoutines,
  getWorkoutLogs,
  saveWorkoutLog,
  getBodyMeasurements,
  saveBodyMeasurement,
  getSettings,
  saveSettings,
  getActiveSession,
  saveActiveSession,
  onStorageMutation,
} from '../db/storage';
import {
  WorkoutRoutine,
  WorkoutLog,
  BodyMeasurement,
  UserSettings,
  ActiveWorkoutSession,
} from '../types';
import { normalizeDate } from '../utils/formatters';

let isPullingFromCloud = false;

// Listen to local storage mutations and enqueue for cloud sync
onStorageMutation((type, payload) => {
  if (!isPullingFromCloud) {
    enqueueOfflineMutation(type, payload);
  }
});

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null;
  pendingQueueCount: number;
  message?: string;
}

type SyncListener = (status: SyncStatus) => void;
const listeners = new Set<SyncListener>();

let currentStatus: SyncStatus = {
  state: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle',
  lastSyncedAt: null,
  pendingQueueCount: 0,
};

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener({ ...currentStatus });
    } catch (e) {
      console.warn('Sync listener error', e);
    }
  });
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...currentStatus });
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncStatus(): SyncStatus {
  return { ...currentStatus };
}

// Queue item for offline mutations
interface SyncQueueItem {
  id: string;
  type: 'routine' | 'routine_delete' | 'log' | 'measurement' | 'settings' | 'active_session';
  payload: any;
  timestamp: number;
}

const QUEUE_STORAGE_KEY = 'hp_neon_sync_queue';

function getOfflineQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: SyncQueueItem[]) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    currentStatus.pendingQueueCount = queue.length;
    notifyListeners();
  } catch (e) {
    console.warn('Failed to save offline sync queue', e);
  }
}

export function enqueueOfflineMutation(
  type: SyncQueueItem['type'],
  payload: any
) {
  const queue = getOfflineQueue();
  const item: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    timestamp: Date.now(),
  };
  queue.push(item);
  saveOfflineQueue(queue);

  // If online, attempt to flush queue
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    processSyncQueue();
  }
}

/**
 * Process pending offline mutations
 */
export async function processSyncQueue(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    currentStatus.state = 'offline';
    notifyListeners();
    return;
  }

  const user = getCurrentUser();
  if (!user) {
    return;
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  currentStatus.state = 'syncing';
  notifyListeners();

  const remainingQueue: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'routine') {
        const r = item.payload as WorkoutRoutine;
        await sql`
          INSERT INTO routines (id, user_id, name, description, day_of_week, is_rest_day, color, plan_name, estimated_minutes, total_planned_sets, exercises, target_muscle_groups, updated_at)
          VALUES (${r.id}, ${user.id}, ${r.name}, ${r.description || ''}, ${r.dayOfWeek}, ${r.isRestDay}, ${r.color}, ${r.planName || 'Treino de Hipertrofia'}, ${r.estimatedMinutes || ''}, ${r.totalPlannedSets || 0}, ${JSON.stringify(r.exercises || [])}, ${JSON.stringify(r.targetMuscleGroups || [])}, NOW())
          ON CONFLICT (id, user_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            day_of_week = EXCLUDED.day_of_week,
            is_rest_day = EXCLUDED.is_rest_day,
            color = EXCLUDED.color,
            plan_name = EXCLUDED.plan_name,
            estimated_minutes = EXCLUDED.estimated_minutes,
            total_planned_sets = EXCLUDED.total_planned_sets,
            exercises = EXCLUDED.exercises,
            target_muscle_groups = EXCLUDED.target_muscle_groups,
            updated_at = NOW()
        `;
      } else if (item.type === 'routine_delete') {
        await sql`
          DELETE FROM routines WHERE id = ${item.payload.id} AND user_id = ${user.id}
        `;
      } else if (item.type === 'log') {
        const l = item.payload as WorkoutLog;
        await sql`
          INSERT INTO workout_logs (id, user_id, routine_id, routine_name, date, duration_minutes, total_volume_kg, total_sets_completed, exercises, notes, updated_at)
          VALUES (${l.id}, ${user.id}, ${l.routineId}, ${l.routineName}, ${l.date}, ${l.durationMinutes}, ${l.totalVolumeKg}, ${l.totalSetsCompleted}, ${JSON.stringify(l.exercises || [])}, ${l.notes || ''}, NOW())
          ON CONFLICT (id, user_id) DO UPDATE SET
            routine_id = EXCLUDED.routine_id,
            routine_name = EXCLUDED.routine_name,
            date = EXCLUDED.date,
            duration_minutes = EXCLUDED.duration_minutes,
            total_volume_kg = EXCLUDED.total_volume_kg,
            total_sets_completed = EXCLUDED.total_sets_completed,
            exercises = EXCLUDED.exercises,
            notes = EXCLUDED.notes,
            updated_at = NOW()
        `;
      } else if (item.type === 'measurement') {
        const m = item.payload as BodyMeasurement;
        await sql`
          INSERT INTO body_measurements (id, user_id, date, weight_kg, waist_cm, chest_cm, arm_cm, thigh_cm, hip_cm, calf_cm, notes, updated_at)
          VALUES (${m.id}, ${user.id}, ${m.date}, ${m.weightKg ?? null}, ${m.waistCm ?? null}, ${m.chestCm ?? null}, ${m.armCm ?? null}, ${m.thighCm ?? null}, ${m.hipCm ?? null}, ${m.calfCm ?? null}, ${m.notes || ''}, NOW())
          ON CONFLICT (id, user_id) DO UPDATE SET
            date = EXCLUDED.date,
            weight_kg = EXCLUDED.weight_kg,
            waist_cm = EXCLUDED.waist_cm,
            chest_cm = EXCLUDED.chest_cm,
            arm_cm = EXCLUDED.arm_cm,
            thigh_cm = EXCLUDED.thigh_cm,
            hip_cm = EXCLUDED.hip_cm,
            calf_cm = EXCLUDED.calf_cm,
            notes = EXCLUDED.notes,
            updated_at = NOW()
        `;
      } else if (item.type === 'settings') {
        const s = item.payload as UserSettings;
        await sql`
          INSERT INTO user_settings (user_id, theme, accent_color, default_rest_seconds, sound_enabled, vibration_enabled, weight_unit, auto_start_rest, weekly_workout_goal, user_name, motivational_message, updated_at)
          VALUES (${user.id}, ${s.theme}, ${s.accentColor}, ${s.defaultRestSeconds}, ${s.soundEnabled}, ${s.vibrationEnabled}, ${s.weightUnit}, ${s.autoStartRest}, ${s.weeklyWorkoutGoal}, ${s.userName}, ${s.motivationalMessage || ''}, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            theme = EXCLUDED.theme,
            accent_color = EXCLUDED.accent_color,
            default_rest_seconds = EXCLUDED.default_rest_seconds,
            sound_enabled = EXCLUDED.sound_enabled,
            vibration_enabled = EXCLUDED.vibration_enabled,
            weight_unit = EXCLUDED.weight_unit,
            auto_start_rest = EXCLUDED.auto_start_rest,
            weekly_workout_goal = EXCLUDED.weekly_workout_goal,
            user_name = EXCLUDED.user_name,
            motivational_message = EXCLUDED.motivational_message,
            updated_at = NOW()
        `;
      } else if (item.type === 'active_session') {
        const sess = item.payload as ActiveWorkoutSession | null;
        if (!sess) {
          await sql`DELETE FROM active_sessions WHERE user_id = ${user.id}`;
        } else {
          await sql`
            INSERT INTO active_sessions (user_id, session_data, updated_at)
            VALUES (${user.id}, ${JSON.stringify(sess)}, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
              session_data = EXCLUDED.session_data,
              updated_at = NOW()
          `;
        }
      }
    } catch (err: any) {
      console.warn('Failed item in sync queue, retaining:', item.type, err?.message);
      remainingQueue.push(item);
    }
  }

  saveOfflineQueue(remainingQueue);

  if (remainingQueue.length === 0) {
    currentStatus.state = 'synced';
    currentStatus.lastSyncedAt = Date.now();
    currentStatus.message = 'Sincronizado com o Neon Cloud';
  } else {
    currentStatus.state = 'error';
    currentStatus.message = `${remainingQueue.length} itens pendentes de sincronização.`;
  }
  notifyListeners();
}

/**
 * Full Pull & Reconciliation from Neon Cloud:
 * Loads remote data and merges cleanly with local IndexedDB records without duplicates.
 */
export async function syncAllWithCloud(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    currentStatus.state = 'offline';
    notifyListeners();
    return false;
  }

  const user = getCurrentUser();
  if (!user) {
    currentStatus.state = 'idle';
    notifyListeners();
    return false;
  }

  currentStatus.state = 'syncing';
  notifyListeners();

  isPullingFromCloud = true;
  try {
    // 1. Flush offline queue first
    await processSyncQueue();

    // 2. Fetch remote routines
    const remoteRoutines = await sql`
      SELECT * FROM routines WHERE user_id = ${user.id}
    `;

    if (remoteRoutines && remoteRoutines.length > 0) {
      const localRoutines = await getRoutines();
      const localMap = new Map(localRoutines.map((r) => [r.id, r]));

      for (const raw of remoteRoutines) {
        const formatted: WorkoutRoutine = {
          id: raw.id,
          name: raw.name,
          description: raw.description || '',
          dayOfWeek: raw.day_of_week,
          isRestDay: raw.is_rest_day,
          color: raw.color,
          planName: raw.plan_name,
          estimatedMinutes: raw.estimated_minutes,
          totalPlannedSets: raw.total_planned_sets,
          exercises: raw.exercises || [],
          targetMuscleGroups: raw.target_muscle_groups || [],
        };
        localMap.set(formatted.id, formatted);
      }
      await saveRoutines(Array.from(localMap.values()));
    } else {
      // If remote has no routines, push existing local routines to cloud
      const localRoutines = await getRoutines();
      for (const r of localRoutines) {
        await sql`
          INSERT INTO routines (id, user_id, name, description, day_of_week, is_rest_day, color, plan_name, estimated_minutes, total_planned_sets, exercises, target_muscle_groups, updated_at)
          VALUES (${r.id}, ${user.id}, ${r.name}, ${r.description || ''}, ${r.dayOfWeek}, ${r.isRestDay}, ${r.color}, ${r.planName || 'Treino de Hipertrofia'}, ${r.estimatedMinutes || ''}, ${r.totalPlannedSets || 0}, ${JSON.stringify(r.exercises || [])}, ${JSON.stringify(r.targetMuscleGroups || [])}, NOW())
          ON CONFLICT (id, user_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            day_of_week = EXCLUDED.day_of_week,
            is_rest_day = EXCLUDED.is_rest_day,
            color = EXCLUDED.color,
            plan_name = EXCLUDED.plan_name,
            estimated_minutes = EXCLUDED.estimated_minutes,
            total_planned_sets = EXCLUDED.total_planned_sets,
            exercises = EXCLUDED.exercises,
            target_muscle_groups = EXCLUDED.target_muscle_groups,
            updated_at = NOW()
        `;
      }
    }

    // 3. Fetch remote workout logs (with deduplication by id)
    const remoteLogs = await sql`
      SELECT * FROM workout_logs WHERE user_id = ${user.id}
    `;

    if (remoteLogs && remoteLogs.length > 0) {
      const localLogs = await getWorkoutLogs();
      const localLogIds = new Set(localLogs.map((l) => l.id));

      for (const raw of remoteLogs) {
        if (!localLogIds.has(raw.id)) {
          const formatted: WorkoutLog = {
            id: raw.id,
            routineId: raw.routine_id,
            routineName: raw.routine_name,
            date: normalizeDate(raw.date),
            durationMinutes: raw.duration_minutes,
            totalVolumeKg: Number(raw.total_volume_kg),
            totalSetsCompleted: raw.total_sets_completed,
            exercises: raw.exercises,
            notes: raw.notes,
          };
          await saveWorkoutLog(formatted);
        }
      }
    }

    // 4. Fetch remote measurements
    const remoteMeasurements = await sql`
      SELECT * FROM body_measurements WHERE user_id = ${user.id}
    `;

    if (remoteMeasurements && remoteMeasurements.length > 0) {
      const localM = await getBodyMeasurements();
      const localMIds = new Set(localM.map((m) => m.id));

      for (const raw of remoteMeasurements) {
        if (!localMIds.has(raw.id)) {
          const formatted: BodyMeasurement = {
            id: raw.id,
            date: normalizeDate(raw.date),
            weightKg: raw.weight_kg ? Number(raw.weight_kg) : undefined,
            waistCm: raw.waist_cm ? Number(raw.waist_cm) : undefined,
            chestCm: raw.chest_cm ? Number(raw.chest_cm) : undefined,
            armCm: raw.arm_cm ? Number(raw.arm_cm) : undefined,
            thighCm: raw.thigh_cm ? Number(raw.thigh_cm) : undefined,
            hipCm: raw.hip_cm ? Number(raw.hip_cm) : undefined,
            calfCm: raw.calf_cm ? Number(raw.calf_cm) : undefined,
            notes: raw.notes,
          };
          await saveBodyMeasurement(formatted);
        }
      }
    }

    // 5. Fetch remote settings
    const remoteSettings = await sql`
      SELECT * FROM user_settings WHERE user_id = ${user.id} LIMIT 1
    `;

    if (remoteSettings && remoteSettings.length > 0) {
      const raw = remoteSettings[0];
      const current = await getSettings();
      const updated: UserSettings = {
        ...current,
        theme: raw.theme || current.theme,
        accentColor: raw.accent_color || current.accentColor,
        defaultRestSeconds: raw.default_rest_seconds || current.defaultRestSeconds,
        soundEnabled: raw.sound_enabled ?? current.soundEnabled,
        vibrationEnabled: raw.vibration_enabled ?? current.vibrationEnabled,
        weightUnit: raw.weight_unit || current.weightUnit,
        autoStartRest: raw.auto_start_rest ?? current.autoStartRest,
        weeklyWorkoutGoal: raw.weekly_workout_goal || current.weeklyWorkoutGoal,
        userName: raw.user_name || current.userName,
        motivationalMessage: raw.motivational_message || current.motivationalMessage,
        syncStatus: 'synced',
        lastSyncTimestamp: Date.now(),
      };
      await saveSettings(updated);
    }

    // 6. Fetch active session
    const remoteSession = await sql`
      SELECT session_data FROM active_sessions WHERE user_id = ${user.id} LIMIT 1
    `;

    if (remoteSession && remoteSession.length > 0) {
      const sessionData = remoteSession[0].session_data;
      if (sessionData) {
        await saveActiveSession(sessionData);
      }
    }

    currentStatus.state = 'synced';
    currentStatus.lastSyncedAt = Date.now();
    currentStatus.message = 'Sincronização com o Neon concluída.';
    notifyListeners();
    return true;
  } catch (err: any) {
    console.warn('Sync with cloud encountered error:', err?.message || err);
    currentStatus.state = 'error';
    currentStatus.message = err?.message || 'Erro na sincronização.';
    notifyListeners();
    return false;
  } finally {
    isPullingFromCloud = false;
  }
}

// Window online / offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    currentStatus.state = 'syncing';
    notifyListeners();
    syncAllWithCloud();
  });

  window.addEventListener('offline', () => {
    currentStatus.state = 'offline';
    currentStatus.message = 'Modo offline (dados preservados no aparelho).';
    notifyListeners();
  });
}