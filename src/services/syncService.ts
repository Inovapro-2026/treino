/**
 * Bidirectional Synchronization Service: IndexedDB <-> Supabase Cloud
 * Handles real-time syncing, offline queues, conflict resolution, and data recovery
 */
import { supabase } from '../lib/supabase';
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

const QUEUE_STORAGE_KEY = 'hp_supabase_sync_queue';

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        const { error } = await supabase.from('routines').upsert({
          id: r.id,
          user_id: user.id,
          name: r.name,
          description: r.description,
          day_of_week: r.dayOfWeek,
          is_rest_day: r.isRestDay,
          color: r.color,
          plan_name: r.planName,
          estimated_minutes: r.estimatedMinutes,
          total_planned_sets: r.totalPlannedSets,
          exercises: r.exercises,
          target_muscle_groups: r.targetMuscleGroups,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else if (item.type === 'routine_delete') {
        const { error } = await supabase
          .from('routines')
          .delete()
          .eq('id', item.payload.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else if (item.type === 'log') {
        const l = item.payload as WorkoutLog;
        const { error } = await supabase.from('workout_logs').upsert({
          id: l.id,
          user_id: user.id,
          routine_id: l.routineId,
          routine_name: l.routineName,
          date: l.date,
          duration_minutes: l.durationMinutes,
          total_volume_kg: l.totalVolumeKg,
          total_sets_completed: l.totalSetsCompleted,
          exercises: l.exercises,
          notes: l.notes,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else if (item.type === 'measurement') {
        const m = item.payload as BodyMeasurement;
        const { error } = await supabase.from('body_measurements').upsert({
          id: m.id,
          user_id: user.id,
          date: m.date,
          weight_kg: m.weightKg,
          waist_cm: m.waistCm,
          chest_cm: m.chestCm,
          arm_cm: m.armCm,
          thigh_cm: m.thighCm,
          hip_cm: m.hipCm,
          calf_cm: m.calfCm,
          notes: m.notes,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else if (item.type === 'settings') {
        const s = item.payload as UserSettings;
        const { error } = await supabase.from('user_settings').upsert({
          user_id: user.id,
          theme: s.theme,
          accent_color: s.accentColor,
          default_rest_seconds: s.defaultRestSeconds,
          sound_enabled: s.soundEnabled,
          vibration_enabled: s.vibrationEnabled,
          weight_unit: s.weightUnit,
          auto_start_rest: s.autoStartRest,
          weekly_workout_goal: s.weeklyWorkoutGoal,
          user_name: s.userName,
          motivational_message: s.motivationalMessage,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else if (item.type === 'active_session') {
        const sess = item.payload as ActiveWorkoutSession | null;
        if (!sess) {
          await supabase.from('active_sessions').delete().eq('user_id', user.id);
        } else {
          await supabase.from('active_sessions').upsert({
            user_id: user.id,
            session_data: sess,
            updated_at: new Date().toISOString(),
          });
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
    currentStatus.message = 'Sincronizado com a nuvem Supabase';
  } else {
    currentStatus.state = 'error';
    currentStatus.message = `${remainingQueue.length} itens pendentes de sincronização.`;
  }
  notifyListeners();
}

/**
 * Full Pull & Reconciliation from Supabase Cloud:
 * Loads remote data and merges cleanly with local IndexedDB records without duplicates.
 */
export async function syncAllWithCloud(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    currentStatus.state = 'offline';
    notifyListeners();
    return false;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    const { data: remoteRoutines, error: routinesError } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', user.id);

    if (routinesError && !routinesError.message.includes('Could not find the table')) {
      throw routinesError;
    }

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
        await supabase.from('routines').upsert({
          id: r.id,
          user_id: user.id,
          name: r.name,
          description: r.description,
          day_of_week: r.dayOfWeek,
          is_rest_day: r.isRestDay,
          color: r.color,
          plan_name: r.planName,
          estimated_minutes: r.estimatedMinutes,
          total_planned_sets: r.totalPlannedSets,
          exercises: r.exercises,
          target_muscle_groups: r.targetMuscleGroups,
          updated_at: new Date().toISOString(),
        });
      }
    }

    // 3. Fetch remote workout logs (with deduplication by id)
    const { data: remoteLogs, error: logsError } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', user.id);

    if (!logsError && remoteLogs && remoteLogs.length > 0) {
      const localLogs = await getWorkoutLogs();
      const localLogIds = new Set(localLogs.map((l) => l.id));

      for (const raw of remoteLogs) {
        if (!localLogIds.has(raw.id)) {
          const formatted: WorkoutLog = {
            id: raw.id,
            routineId: raw.routine_id,
            routineName: raw.routine_name,
            date: raw.date,
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
    const { data: remoteMeasurements, error: mError } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id);

    if (!mError && remoteMeasurements && remoteMeasurements.length > 0) {
      const localM = await getBodyMeasurements();
      const localMIds = new Set(localM.map((m) => m.id));

      for (const raw of remoteMeasurements) {
        if (!localMIds.has(raw.id)) {
          const formatted: BodyMeasurement = {
            id: raw.id,
            date: raw.date,
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
    const { data: remoteSettings, error: sError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sError && remoteSettings) {
      const current = await getSettings();
      const updated: UserSettings = {
        ...current,
        theme: remoteSettings.theme || current.theme,
        accentColor: remoteSettings.accent_color || current.accentColor,
        defaultRestSeconds: remoteSettings.default_rest_seconds || current.defaultRestSeconds,
        soundEnabled: remoteSettings.sound_enabled ?? current.soundEnabled,
        vibrationEnabled: remoteSettings.vibration_enabled ?? current.vibrationEnabled,
        weightUnit: remoteSettings.weight_unit || current.weightUnit,
        autoStartRest: remoteSettings.auto_start_rest ?? current.autoStartRest,
        weeklyWorkoutGoal: remoteSettings.weekly_workout_goal || current.weeklyWorkoutGoal,
        userName: remoteSettings.user_name || current.userName,
        motivationalMessage: remoteSettings.motivational_message || current.motivationalMessage,
        syncStatus: 'synced',
        lastSyncTimestamp: Date.now(),
      };
      await saveSettings(updated);
    }

    currentStatus.state = 'synced';
    currentStatus.lastSyncedAt = Date.now();
    currentStatus.message = 'Sincronização com o Supabase concluída.';
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
