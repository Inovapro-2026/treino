/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  WorkoutRoutine,
  Exercise,
  WorkoutLog,
  BodyMeasurement,
  UserSettings,
  ActiveWorkoutSession,
  AuthSession,
} from './types';
import {
  getRoutines,
  saveRoutine,
  deleteRoutine,
  getExercises,
  saveExercise,
  getActiveSession,
  saveActiveSession,
  getWorkoutLogs,
  saveWorkoutLog,
  deleteWorkoutLog,
  getBodyMeasurements,
  saveBodyMeasurement,
  deleteBodyMeasurement,
  getSettings,
  saveSettings,
  getActiveAuthSession,
  saveActiveAuthSession,
} from './db/storage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { RoutinesView } from './components/routines/RoutinesView';
import { ExerciseLibrary } from './components/exercises/ExerciseLibrary';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { MeasurementsView } from './components/measurements/MeasurementsView';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { ActiveWorkoutModal } from './components/workout/ActiveWorkoutModal';
import { AddMeasurementModal } from './components/measurements/AddMeasurementModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { LoginView } from './components/auth/LoginView';
import { DEFAULT_SETTINGS } from './db/defaultData';
import { Dumbbell } from 'lucide-react';
import { syncAllWithCloud, subscribeToSyncStatus, SyncStatus } from './services/syncService';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(null);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isNewMeasurementOpen, setIsNewMeasurementOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Authentication & Supabase Sync states
  const [currentAuthSession, setCurrentAuthSession] = useState<AuthSession | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'idle', lastSyncedAt: null, pendingQueueCount: 0 });

  // Load all persistent data on startup
  const loadData = useCallback(async () => {
    try {
      const [
        loadedRoutines,
        loadedExercises,
        loadedLogs,
        loadedMeasurements,
        loadedSettings,
        loadedActiveSession,
        loadedAuthSession,
      ] = await Promise.all([
        getRoutines(),
        getExercises(),
        getWorkoutLogs(),
        getBodyMeasurements(),
        getSettings(),
        getActiveSession(),
        getActiveAuthSession(),
      ]);

      setRoutines(loadedRoutines);
      setExercises(loadedExercises);
      setLogs(loadedLogs);
      setMeasurements(loadedMeasurements);
      setSettings(loadedSettings);
      setCurrentAuthSession(loadedAuthSession);

      if (loadedAuthSession) {
        // Trigger background sync with Supabase
        syncAllWithCloud();
      }

      if (loadedActiveSession) {
        setActiveSession(loadedActiveSession);
        // O cronômetro só inicia e a tela só abre quando o usuário clica no botão de treino
        setIsWorkoutModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to load storage data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to real-time sync status
  useEffect(() => {
    const unsub = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    await saveActiveAuthSession(null);
    setCurrentAuthSession(null);
  };

  // Calculate workout streak in weeks meeting goal
  const streakCount = React.useMemo(() => {
    if (logs.length === 0) return 0;

    // Group logs by week ISO string
    const weeksMap = new Map<string, number>();
    for (const log of logs) {
      const d = new Date(log.date);
      const year = d.getFullYear();
      // Simple week key
      const oneJan = new Date(year, 0, 1);
      const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
      const weekKey = `${year}-W${weekNumber}`;
      weeksMap.set(weekKey, (weeksMap.get(weekKey) || 0) + 1);
    }

    let streak = 0;
    const now = new Date();
    const curYear = now.getFullYear();
    const oneJan = new Date(curYear, 0, 1);
    const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const currentWeekNum = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);

    for (let w = currentWeekNum; w >= 1; w--) {
      const key = `${curYear}-W${w}`;
      const count = weeksMap.get(key) || 0;
      if (w === currentWeekNum) {
        // Current in-progress week counts if already started
        if (count > 0) streak += 1;
      } else if (count >= Math.min(3, settings.weeklyWorkoutGoal || 5)) {
        streak += 1;
      } else {
        break;
      }
    }

    return streak;
  }, [logs, settings.weeklyWorkoutGoal]);

  // Start or resume workout when user clicks the workout button
  const handleStartWorkout = (routine: WorkoutRoutine) => {
    // If active session already exists for this routine, resume it
    if (activeSession && activeSession.routineId === routine.id) {
      setIsWorkoutModalOpen(true);
      return;
    }

    // Clone exercises and sets for the session
    const clonedExercises = routine.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({
        ...s,
        completed: false,
        actualReps: s.targetReps,
        actualWeightKg: s.targetWeightKg,
      })),
    }));

    const now = Date.now();
    const newSession: ActiveWorkoutSession = {
      id: `session_${now}`,
      routineId: routine.id,
      routineName: routine.name,
      startTime: now,
      isStarted: true,
      totalPausedDurationMs: 0,
      currentExerciseIndex: 0,
      exercises: clonedExercises,
      isCompleted: false,
    };

    setActiveSession(newSession);
    saveActiveSession(newSession);
    setIsWorkoutModalOpen(true);
  };

  const handleSaveSession = (updated: ActiveWorkoutSession) => {
    setActiveSession(updated);
    saveActiveSession(updated);
  };

  const handleFinishWorkout = async (log: WorkoutLog) => {
    await saveWorkoutLog(log);
    await saveActiveSession(null);
    setActiveSession(null);
    setIsWorkoutModalOpen(false);
    setLogs((prev) => [log, ...prev]);
  };

  const handleDiscardWorkout = async () => {
    await saveActiveSession(null);
    setActiveSession(null);
    setIsWorkoutModalOpen(false);
  };

  // Routine Handlers
  const handleSaveRoutine = async (updated: WorkoutRoutine) => {
    await saveRoutine(updated);
    setRoutines((prev) => {
      const index = prev.findIndex((r) => r.id === updated.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = updated;
        return copy;
      }
      return [...prev, updated];
    });
  };

  const handleDeleteRoutine = async (id: string) => {
    await deleteRoutine(id);
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDuplicateRoutine = async (routine: WorkoutRoutine) => {
    const duplicated: WorkoutRoutine = {
      ...routine,
      id: `routine_copy_${Date.now()}`,
      name: `${routine.name} (Cópia)`,
      dayOfWeek: (routine.dayOfWeek + 1) % 7,
      exercises: routine.exercises.map((ex) => ({
        ...ex,
        id: `ex_copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sets: ex.sets.map((s) => ({ ...s, id: `s_${Date.now()}_${Math.random()}` })),
      })),
    };
    await saveRoutine(duplicated);
    setRoutines((prev) => [...prev, duplicated]);
  };

  // Exercise Handlers
  const handleSaveExercise = async (exercise: Exercise) => {
    await saveExercise(exercise);
    setExercises((prev) => {
      const idx = prev.findIndex((e) => e.id === exercise.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = exercise;
        return copy;
      }
      return [...prev, exercise];
    });
  };

  const handleToggleFavorite = async (exerciseId: string) => {
    const target = exercises.find((e) => e.id === exerciseId);
    if (!target) return;
    const updated = { ...target, isFavorite: !target.isFavorite };
    await saveExercise(updated);
    setExercises((prev) => prev.map((e) => (e.id === exerciseId ? updated : e)));
  };

  // Measurement Handlers
  const handleSaveMeasurement = async (measurement: BodyMeasurement) => {
    await saveBodyMeasurement(measurement);
    setMeasurements((prev) => {
      const idx = prev.findIndex((m) => m.id === measurement.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = measurement;
        return copy;
      }
      return [measurement, ...prev];
    });
  };

  const handleDeleteMeasurement = async (id: string) => {
    await deleteBodyMeasurement(id);
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  };

  // Log Handlers
  const handleDeleteLog = async (id: string) => {
    await deleteWorkoutLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  // Settings Handlers
  const handleSaveSettings = async (updated: UserSettings) => {
    await saveSettings(updated);
    setSettings(updated);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400 text-zinc-950 animate-pulse">
          <Dumbbell className="h-6 w-6" />
        </div>
        <p className="mt-4 text-xs font-mono font-semibold text-zinc-400 uppercase tracking-widest">
          Carregando HyperPulse...
        </p>
      </div>
    );
  }

  // Auth Guard: Unauthenticated users are presented with the 6-digit numeric login screen
  if (!currentAuthSession) {
    return (
      <LoginView
        onLoginSuccess={(session) => {
          setCurrentAuthSession(session);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-lime-400 selection:text-zinc-950 font-sans">
      {/* Top Navbar */}
      <Navbar
        settings={settings}
        activeSession={activeSession}
        onResumeWorkout={() => setIsWorkoutModalOpen(true)}
        streakDays={streakCount}
        currentUser={currentAuthSession}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        onSyncClick={() => syncAllWithCloud()}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar Navigation (Desktop & Mobile) */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          streakCount={streakCount}
          currentUser={currentAuthSession}
          onLogout={handleLogout}
        />

        {/* Content View */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-12 max-w-5xl overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <Dashboard
              routines={routines}
              logs={logs}
              measurements={measurements}
              settings={settings}
              streakCount={streakCount}
              activeSession={activeSession}
              onStartWorkout={handleStartWorkout}
              onNavigateTab={setCurrentTab}
              onOpenNewMeasurement={() => setIsNewMeasurementOpen(true)}
            />
          )}

          {currentTab === 'routines' && (
            <RoutinesView
              routines={routines}
              allExercises={exercises}
              onStartWorkout={handleStartWorkout}
              onSaveRoutine={handleSaveRoutine}
              onDeleteRoutine={handleDeleteRoutine}
              onDuplicateRoutine={handleDuplicateRoutine}
            />
          )}

          {currentTab === 'exercises' && (
            <ExerciseLibrary
              exercises={exercises}
              logs={logs}
              onSaveExercise={handleSaveExercise}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView
              logs={logs}
              measurements={measurements}
              exercises={exercises}
            />
          )}

          {currentTab === 'measurements' && (
            <MeasurementsView
              measurements={measurements}
              onSaveMeasurement={handleSaveMeasurement}
              onDeleteMeasurement={handleDeleteMeasurement}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView
              logs={logs}
              routines={routines}
              onDeleteLog={handleDeleteLog}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onDataReload={loadData}
            />
          )}
        </main>
      </div>

      {/* Active Workout Fullscreen Experience */}
      {isWorkoutModalOpen && activeSession && (
        <ActiveWorkoutModal
          session={activeSession}
          settings={settings}
          previousLogs={logs}
          onSaveSession={handleSaveSession}
          onFinishWorkout={handleFinishWorkout}
          onDiscardWorkout={handleDiscardWorkout}
        />
      )}

      {/* Add Measurement Quick Modal */}
      <AddMeasurementModal
        isOpen={isNewMeasurementOpen}
        onSave={handleSaveMeasurement}
        onClose={() => setIsNewMeasurementOpen(false)}
      />

      {/* Offline Status Badge */}
      <OfflineIndicator />
    </div>
  );
}
