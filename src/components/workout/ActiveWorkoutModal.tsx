import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  AlertTriangle,
  Plus,
  Trash2,
  Flame,
  Award,
  Sparkles,
  Info,
  TrendingUp,
  List,
  FastForward,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ActiveWorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  WorkoutLog,
  UserSettings,
  ActiveRestTimer,
} from '../../types';
import { RestTimer } from './RestTimer';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { formatSecondsToTime, formatWeight, MUSCLE_GROUP_LABELS } from '../../utils/formatters';
import { playCompleteChime, triggerHaptic } from '../../utils/audio';

interface ActiveWorkoutModalProps {
  session: ActiveWorkoutSession;
  settings: UserSettings;
  previousLogs: WorkoutLog[];
  onSaveSession: (session: ActiveWorkoutSession) => void;
  onFinishWorkout: (log: WorkoutLog) => void;
  onDiscardWorkout: () => void;
}

export const ActiveWorkoutModal: React.FC<ActiveWorkoutModalProps> = ({
  session,
  settings,
  previousLogs,
  onSaveSession,
  onFinishWorkout,
  onDiscardWorkout,
}) => {
  // Session time tracking
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isWorkoutPaused, setIsWorkoutPaused] = useState<boolean>(!!session.pausedAt);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(
    session.currentExerciseIndex || 0
  );
  const [exercises, setExercises] = useState<WorkoutExercise[]>(session.exercises);
  const [restTimer, setRestTimer] = useState<ActiveRestTimer | undefined>(session.restTimer);
  const [isRestModalOpen, setIsRestModalOpen] = useState<boolean>(!!session.restTimer?.active);

  // Modals & Drawers
  const [isExercisesDrawerOpen, setIsExercisesDrawerOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [incompleteSetsWarningOpen, setIncompleteSetsWarningOpen] = useState(false);
  const [skipExerciseConfirmOpen, setSkipExerciseConfirmOpen] = useState(false);
  const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showExerciseGuidance, setShowExerciseGuidance] = useState(false);

  // Notes state
  const [workoutNotes, setWorkoutNotes] = useState<string>(session.notes || '');

  // Guard against rapid duplicate clicks on toggle
  const lastActionTimestamp = useRef<number>(0);

  // Calculate elapsed time from start timestamp
  useEffect(() => {
    if (session.isStarted === false) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const now = Date.now();
      let totalTime = now - session.startTime - (session.totalPausedDurationMs || 0);
      if (session.pausedAt) {
        totalTime -= now - session.pausedAt;
      }
      setElapsedSeconds(Math.max(0, Math.floor(totalTime / 1000)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [session.startTime, session.pausedAt, session.totalPausedDurationMs, session.isStarted]);

  // Sync state to persistent storage
  const syncSession = (
    newExercises: WorkoutExercise[],
    newExIndex: number,
    newTimer?: ActiveRestTimer,
    isPaused?: boolean
  ) => {
    const updated: ActiveWorkoutSession = {
      ...session,
      exercises: newExercises,
      currentExerciseIndex: newExIndex,
      restTimer: newTimer,
      notes: workoutNotes,
      pausedAt: isPaused ? session.pausedAt || Date.now() : undefined,
    };
    onSaveSession(updated);
  };

  const currentExercise = exercises[currentExerciseIndex] || exercises[0];

  // Look up previous performance for the current exercise from previousLogs
  const previousExercisePerformance = useMemo(() => {
    if (!currentExercise) return null;
    for (const log of previousLogs) {
      const matched = log.exercises.find((e) => e.exerciseId === currentExercise.exerciseId);
      if (matched && matched.completedSets.length > 0) {
        return matched.completedSets;
      }
    }
    return null;
  }, [currentExercise, previousLogs]);

  // Total counts for overall session
  const totalSets = useMemo(
    () => exercises.reduce((acc, ex) => acc + ex.sets.length, 0),
    [exercises]
  );
  const completedSetsCount = useMemo(
    () => exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed && !s.skipped).length, 0),
    [exercises]
  );
  const skippedSetsCount = useMemo(
    () => exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.skipped).length, 0),
    [exercises]
  );
  const progressPercent = totalSets > 0 ? Math.round((completedSetsCount / totalSets) * 100) : 0;

  // Counts for current exercise
  const currentCompletedCount = currentExercise
    ? currentExercise.sets.filter((s) => s.completed && !s.skipped).length
    : 0;
  const currentSkippedCount = currentExercise
    ? currentExercise.sets.filter((s) => s.skipped).length
    : 0;
  const currentRemainingPending = currentExercise
    ? currentExercise.sets.filter((s) => !s.completed && !s.skipped).length
    : 0;
  const isCurrentExerciseDone = currentRemainingPending === 0;

  // Start workout timer explicitly if in waiting state
  const handleStartWorkoutTimer = () => {
    const now = Date.now();
    const updated: ActiveWorkoutSession = {
      ...session,
      isStarted: true,
      startTime: now,
      pausedAt: undefined,
      totalPausedDurationMs: 0,
      exercises,
      currentExerciseIndex,
      restTimer,
      notes: workoutNotes,
    };
    onSaveSession(updated);
  };

  // Toggle set completion (Concluir)
  const handleCompleteSet = (setIndex: number) => {
    const now = Date.now();
    if (now - lastActionTimestamp.current < 250) return; // Debounce rapid taps
    lastActionTimestamp.current = now;

    if (session.isStarted === false) {
      session.isStarted = true;
      session.startTime = now;
      session.totalPausedDurationMs = 0;
      session.pausedAt = undefined;
    }

    const set = currentExercise.sets[setIndex];
    const willBeCompleted = !set.completed;

    const updatedSets = currentExercise.sets.map((s, idx) => {
      if (idx === setIndex) {
        const parsedReps =
          s.actualReps !== undefined && s.actualReps !== ''
            ? parseInt(String(s.actualReps), 10) || s.targetReps
            : s.targetReps;
        const parsedWeight =
          s.actualWeightKg !== undefined && s.actualWeightKg !== ''
            ? parseFloat(String(s.actualWeightKg)) || 0
            : s.targetWeightKg;

        return {
          ...s,
          completed: willBeCompleted,
          skipped: false,
          actualReps: parsedReps,
          actualWeightKg: parsedWeight,
          completedAt: willBeCompleted ? new Date().toISOString() : undefined,
        };
      }
      return s;
    });

    const updatedExercises = exercises.map((ex, idx) =>
      idx === currentExerciseIndex ? { ...ex, sets: updatedSets } : ex
    );

    setExercises(updatedExercises);

    if (willBeCompleted) {
      if (settings.vibrationEnabled) triggerHaptic(70);

      // Optionally auto-open rest timer if enabled in user settings
      if (settings.autoStartRest) {
        const restDuration = set.restSeconds || 90;
        const newTimer: ActiveRestTimer = {
          active: true,
          durationSeconds: restDuration,
          startedAt: Date.now(),
          targetTimestamp: Date.now() + restDuration * 1000,
          isPaused: false,
          exerciseName: currentExercise.exerciseName,
          setIndex: setIndex,
        };
        setRestTimer(newTimer);
        setIsRestModalOpen(true);
        syncSession(updatedExercises, currentExerciseIndex, newTimer);
        return;
      }
    }

    syncSession(updatedExercises, currentExerciseIndex, restTimer);
  };

  // Skip single set (Pular série)
  const handleSkipSet = (setIndex: number) => {
    const now = Date.now();
    if (now - lastActionTimestamp.current < 250) return;
    lastActionTimestamp.current = now;

    const set = currentExercise.sets[setIndex];
    const isCurrentlySkipped = !!set.skipped;

    const updatedSets = currentExercise.sets.map((s, idx) => {
      if (idx === setIndex) {
        return {
          ...s,
          skipped: !isCurrentlySkipped,
          completed: false, // Skipped set is explicitly NOT completed
          completedAt: undefined,
        };
      }
      return s;
    });

    const updatedExercises = exercises.map((ex, idx) =>
      idx === currentExerciseIndex ? { ...ex, sets: updatedSets } : ex
    );

    setExercises(updatedExercises);
    syncSession(updatedExercises, currentExerciseIndex, restTimer);
  };

  // Skip whole exercise (Pular exercício inteiro)
  const handleConfirmSkipExercise = () => {
    setSkipExerciseConfirmOpen(false);

    const updatedSets = currentExercise.sets.map((s) => {
      if (!s.completed) {
        return { ...s, skipped: true, completed: false };
      }
      return s;
    });

    const updatedExercises = exercises.map((ex, idx) =>
      idx === currentExerciseIndex ? { ...ex, sets: updatedSets } : ex
    );

    setExercises(updatedExercises);

    // If there is a next exercise, navigate to it
    if (currentExerciseIndex < exercises.length - 1) {
      const nextIdx = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIdx);
      syncSession(updatedExercises, nextIdx, restTimer);
    } else {
      syncSession(updatedExercises, currentExerciseIndex, restTimer);
    }
  };

  // Open standalone rest timer with specified duration (default 90s)
  const handleOpenRestTimer = (seconds = 90) => {
    const now = Date.now();
    const newTimer: ActiveRestTimer = {
      active: true,
      durationSeconds: seconds,
      startedAt: now,
      targetTimestamp: now + seconds * 1000,
      isPaused: false,
      exerciseName: currentExercise.exerciseName,
      setIndex: currentExercise.sets.findIndex((s) => !s.completed) !== -1
        ? currentExercise.sets.findIndex((s) => !s.completed)
        : currentExercise.sets.length - 1,
    };
    setRestTimer(newTimer);
    setIsRestModalOpen(true);
    syncSession(exercises, currentExerciseIndex, newTimer);
  };

  // Close rest timer modal without affecting completed sets
  const handleCloseRestModal = () => {
    setIsRestModalOpen(false);
  };

  // Skip rest timer
  const handleSkipRestTimer = () => {
    setIsRestModalOpen(false);
    setRestTimer(undefined);
    syncSession(exercises, currentExerciseIndex, undefined);
  };

  // Update set weight and reps dynamically
  const handleUpdateSetValue = (
    setIndex: number,
    field: 'targetWeightKg' | 'actualWeightKg' | 'targetReps' | 'actualReps',
    value: number | string
  ) => {
    const updatedSets = currentExercise.sets.map((s, idx) => {
      if (idx === setIndex) {
        return { ...s, [field]: value };
      }
      return s;
    });

    const updatedExercises = exercises.map((ex, idx) =>
      idx === currentExerciseIndex ? { ...ex, sets: updatedSets } : ex
    );

    setExercises(updatedExercises);
    syncSession(updatedExercises, currentExerciseIndex, restTimer);
  };

  // Unilateral set handlers
  const handleUpdateUnilateralReps = (
    setIndex: number,
    side: 'repsLeft' | 'repsRight',
    val: number | string
  ) => {
    const updatedSets = currentExercise.sets.map((s, idx) => {
      if (idx === setIndex) {
        return { ...s, [side]: val };
      }
      return s;
    });

    const updatedExercises = exercises.map((ex, idx) =>
      idx === currentExerciseIndex ? { ...ex, sets: updatedSets } : ex
    );

    setExercises(updatedExercises);
    syncSession(updatedExercises, currentExerciseIndex, restTimer);
  };

  // Add / remove sets
  const handleAddSet = () => {
    const lastSet = currentExercise.sets[currentExercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: `set_${Date.now()}`,
      setNumber: currentExercise.sets.length + 1,
      targetReps: lastSet ? lastSet.targetReps : 10,
      actualReps: lastSet ? (lastSet.actualReps ?? lastSet.targetReps) : 10,
      targetWeightKg: lastSet ? lastSet.targetWeightKg : 0,
      actualWeightKg: lastSet ? (lastSet.actualWeightKg ?? lastSet.targetWeightKg) : 0,
      restSeconds: lastSet ? lastSet.restSeconds : 90,
      completed: false,
      skipped: false,
    };

    const updatedSets = [...currentExercise.sets, newSet];
    const updatedExercises = exercises.map((ex, idx) =>
      idx === currentExerciseIndex ? { ...ex, sets: updatedSets } : ex
    );

    setExercises(updatedExercises);
    syncSession(updatedExercises, currentExerciseIndex, restTimer);
  };

  const handleRemoveSet = (setIndex: number) => {
    if (currentExercise.sets.length <= 1) return;
    const updatedSets = currentExercise.sets
      .filter((_, idx) => idx !== setIndex)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    const updatedExercises = exercises.map((ex, idx) =>
      idx === currentExerciseIndex ? { ...ex, sets: updatedSets } : ex
    );

    setExercises(updatedExercises);
    syncSession(updatedExercises, currentExerciseIndex, restTimer);
  };

  // Navigation between exercises with guard for incomplete sets
  const handleNavigateExercise = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    if (targetIndex > currentExerciseIndex) {
      // Check if there are pending sets (neither completed nor skipped)
      const hasUnfinishedSets = currentExercise.sets.some((s) => !s.completed && !s.skipped);
      if (hasUnfinishedSets) {
        setPendingNextIndex(targetIndex);
        setIncompleteSetsWarningOpen(true);
        return;
      }
    }

    setCurrentExerciseIndex(targetIndex);
    syncSession(exercises, targetIndex, restTimer);
  };

  // Confirm advance when there are pending sets: marks pending sets as skipped
  const confirmAdvanceWithIncomplete = () => {
    if (pendingNextIndex !== null) {
      const updatedSets = currentExercise.sets.map((s) => {
        if (!s.completed && !s.skipped) {
          return { ...s, skipped: true, completed: false };
        }
        return s;
      });

      const updatedExercises = exercises.map((ex, idx) =>
        idx === currentExerciseIndex ? { ...ex, sets: updatedSets } : ex
      );

      setExercises(updatedExercises);
      setCurrentExerciseIndex(pendingNextIndex);
      syncSession(updatedExercises, pendingNextIndex, restTimer);
      setPendingNextIndex(null);
    }
    setIncompleteSetsWarningOpen(false);
  };

  // Workout pause toggle
  const handleToggleWorkoutPause = () => {
    if (isWorkoutPaused) {
      const pausedDuration = Date.now() - (session.pausedAt || Date.now());
      const newTotalPaused = (session.totalPausedDurationMs || 0) + pausedDuration;
      setIsWorkoutPaused(false);
      const updated: ActiveWorkoutSession = {
        ...session,
        pausedAt: undefined,
        totalPausedDurationMs: newTotalPaused,
      };
      onSaveSession(updated);
    } else {
      setIsWorkoutPaused(true);
      const updated: ActiveWorkoutSession = {
        ...session,
        pausedAt: Date.now(),
      };
      onSaveSession(updated);
    }
  };

  // Finalize and Save Workout
  const handleConfirmFinish = () => {
    setConfirmFinishOpen(false);

    let totalVolume = 0;
    let completedSetsTotal = 0;

    const completedExercisesLog = exercises
      .map((ex) => {
        // ONLY completed sets (excluding skipped ones) are counted in logs and volume!
        const completedSets = ex.sets
          .filter((s) => s.completed && !s.skipped)
          .map((s) => {
            const weight =
              s.actualWeightKg !== undefined && s.actualWeightKg !== ''
                ? parseFloat(String(s.actualWeightKg)) || 0
                : s.targetWeightKg;
            const reps =
              s.actualReps !== undefined && s.actualReps !== ''
                ? parseInt(String(s.actualReps), 10) || s.targetReps
                : s.targetReps;

            const repsL =
              s.repsLeft !== undefined && s.repsLeft !== ''
                ? parseInt(String(s.repsLeft), 10) || reps
                : reps;
            const repsR =
              s.repsRight !== undefined && s.repsRight !== ''
                ? parseInt(String(s.repsRight), 10) || reps
                : reps;

            const effectiveReps = ex.isUnilateral ? repsL + repsR : reps;

            totalVolume += weight * effectiveReps;
            completedSetsTotal += 1;

            return {
              setNumber: s.setNumber,
              weightKg: weight,
              reps: reps,
              repsLeft: s.repsLeft !== undefined ? repsL : undefined,
              repsRight: s.repsRight !== undefined ? repsR : undefined,
            };
          });

        return {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          targetMuscleGroup: ex.targetMuscleGroup,
          isUnilateral: ex.isUnilateral,
          completedSets,
        };
      })
      .filter((ex) => ex.completedSets.length > 0);

    const workoutDurationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    const newLog: WorkoutLog = {
      id: `log_${Date.now()}`,
      routineId: session.routineId,
      routineName: session.routineName,
      date: new Date().toISOString(),
      durationMinutes: workoutDurationMinutes,
      totalVolumeKg: Math.round(totalVolume),
      totalSetsCompleted: completedSetsTotal,
      exercises: completedExercisesLog,
      notes: workoutNotes,
    };

    if (settings.soundEnabled) playCompleteChime();
    if (settings.vibrationEnabled) triggerHaptic([100, 50, 100, 50, 200]);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a3e635', '#22c55e', '#ffffff'],
      });
    } catch {
      // Ignored if confetti is blocked
    }

    onFinishWorkout(newLog);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 overflow-y-auto">
      {/* 1. COMPACT TOP BAR */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-3 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* Close / Exit Button */}
          <button
            onClick={() => setConfirmDiscardOpen(true)}
            className="flex items-center justify-center h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition active:scale-95 shrink-0"
            title="Sair ou descartar treino"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Routine Name & Total Stopwatch */}
          <div className="flex-1 min-w-0 text-center px-1">
            <h1 className="text-xs md:text-sm font-bold text-white truncate tracking-tight">
              {session.routineName || 'Treino em Andamento'}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-0.5 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1 font-bold text-zinc-300">
                <Clock className="w-3 h-3 text-lime-400" />
                {formatSecondsToTime(elapsedSeconds)}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="font-semibold text-lime-400">
                {completedSetsCount}/{totalSets} séries
              </span>
              {isWorkoutPaused && (
                <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-400 uppercase">
                  Pausado
                </span>
              )}
            </div>
          </div>

          {/* Pause / Resume & Finish Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleToggleWorkoutPause}
              className={`flex items-center justify-center h-8 w-8 rounded-xl border transition active:scale-95 ${
                isWorkoutPaused
                  ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
              title={isWorkoutPaused ? 'Retomar treino' : 'Pausar treino'}
            >
              {isWorkoutPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setConfirmFinishOpen(true)}
              className="flex items-center gap-1 h-8 px-2.5 rounded-xl bg-lime-400 text-zinc-950 font-extrabold text-xs hover:bg-lime-300 transition active:scale-95 shadow-sm shadow-lime-950/30"
              title="Finalizar e salvar treino"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span className="hidden xs:inline">Concluir</span>
            </button>
          </div>
        </div>

        {/* Thin Workout Progress Line */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-lime-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Waiting to Start Banner if not yet started */}
      {session.isStarted === false && (
        <div className="max-w-2xl w-full mx-auto px-3 pt-3">
          <div className="rounded-xl border border-lime-400/40 bg-zinc-900 p-3 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400 text-zinc-950 font-bold">
                <Play className="w-4 h-4 fill-current" />
              </div>
              <p className="text-xs text-zinc-300">
                O cronômetro inicia ao clicar em <strong>Iniciar</strong> ou concluir a 1ª série.
              </p>
            </div>
            <button
              onClick={handleStartWorkoutTimer}
              className="shrink-0 rounded-lg bg-lime-400 px-3 py-1.5 text-xs font-black text-zinc-950 hover:bg-lime-300 transition"
            >
              Iniciar
            </button>
          </div>
        </div>
      )}

      {/* 2. COMPACT OVERVIEW BANNER: "Exercícios da sessão" */}
      <section className="max-w-2xl w-full mx-auto px-3 pt-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 flex items-center justify-between gap-2 shadow-sm">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-lime-400">
              Exercício {currentExerciseIndex + 1} de {exercises.length}
            </div>
            <div className="text-xs font-bold text-white truncate">
              {currentExerciseIndex + 1}. {currentExercise.exerciseName}
            </div>
            <div className="text-[11px] text-zinc-400">
              {currentCompletedCount}/{currentExercise.sets.length} séries · {currentExercise.repsRange || '8–12'} reps
            </div>
          </div>

          <button
            onClick={() => setIsExercisesDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-700 transition active:scale-95 shrink-0"
            title="Abrir lista completa de exercícios"
          >
            <List className="w-3.5 h-3.5 text-lime-400" />
            <span>Ver exercícios</span>
          </button>
        </div>
      </section>

      {/* 3. MAIN WORKOUT CARD: CURRENT EXERCISE */}
      <main className="max-w-2xl w-full mx-auto p-3 flex-1 space-y-3 pb-24">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800/80">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-lime-400">
                EXERCÍCIO {currentExerciseIndex + 1} DE {exercises.length}
              </span>
              <h2 className="text-lg md:text-xl font-black text-white tracking-tight mt-0.5">
                {currentExercise.exerciseName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-400">
                <span>{currentExercise.sets.length} séries planejadas</span>
                <span>•</span>
                <span className="font-semibold text-zinc-300">
                  {currentExercise.repsRange || '8–12'} repetições
                </span>
                {currentExercise.isUnilateral && (
                  <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                    Unilateral
                  </span>
                )}
              </div>
            </div>

            {/* Rest Timer Button in header */}
            <button
              onClick={() => handleOpenRestTimer(currentExercise.sets[0]?.restSeconds || 90)}
              className="flex items-center gap-1.5 rounded-xl border border-lime-400/30 bg-lime-400/10 px-3 py-1.5 text-xs font-bold text-lime-400 hover:bg-lime-400/20 transition active:scale-95 shrink-0 shadow-sm"
              title="Abrir cronômetro de descanso independente"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Descanso 1:30</span>
            </button>
          </div>

          {/* Reference: Last session log */}
          {previousExercisePerformance && previousExercisePerformance.length > 0 && (
            <div className="mt-2.5 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-zinc-300 truncate">
                <Award className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span className="text-zinc-400">Última sessão:</span>
                <span className="font-semibold text-white truncate font-mono">
                  {previousExercisePerformance.map((s) => `${s.weightKg}kg × ${s.reps}`).join(' | ')}
                </span>
              </div>
            </div>
          )}

          {/* Collapsible Guidance & Notes */}
          {currentExercise.notes && (
            <div className="mt-2">
              <button
                onClick={() => setShowExerciseGuidance((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition"
              >
                <Info className="w-3 h-3 text-zinc-400" />
                <span>Orientações técnicas</span>
                {showExerciseGuidance ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showExerciseGuidance && (
                <div className="mt-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 text-xs text-zinc-300 animate-in fade-in">
                  {currentExercise.notes}
                </div>
              )}
            </div>
          )}

          {/* COMPACT SETS TABLE */}
          <div className="mt-3.5 space-y-2">
            {/* Table Header */}
            {currentExercise.isUnilateral ? (
              <div className="grid grid-cols-12 gap-1.5 text-[10px] font-extrabold text-zinc-400 px-1 uppercase tracking-wider text-center">
                <div className="col-span-2">Série</div>
                <div className="col-span-3">Carga (kg)</div>
                <div className="col-span-2">Perna E</div>
                <div className="col-span-2">Perna D</div>
                <div className="col-span-3">Ações</div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-1.5 text-[10px] font-extrabold text-zinc-400 px-1 uppercase tracking-wider text-center">
                <div className="col-span-2">Série</div>
                <div className="col-span-4">Carga (kg)</div>
                <div className="col-span-3">Repetições</div>
                <div className="col-span-3">Ações</div>
              </div>
            )}

            {/* Set Rows */}
            {currentExercise.sets.map((set, setIndex) => {
              const currentWeight =
                set.actualWeightKg !== undefined ? set.actualWeightKg : set.targetWeightKg;
              const currentReps =
                set.actualReps !== undefined ? set.actualReps : set.targetReps;

              if (currentExercise.isUnilateral) {
                return (
                  <div
                    key={set.id}
                    className={`grid grid-cols-12 gap-1.5 items-center rounded-xl p-2 border transition-all ${
                      set.completed
                        ? 'border-lime-500/40 bg-lime-500/10'
                        : set.skipped
                        ? 'border-zinc-800 bg-zinc-900/40 opacity-70'
                        : 'border-zinc-800 bg-zinc-950/50'
                    }`}
                  >
                    <div className="col-span-2 text-center font-bold text-xs text-zinc-300">
                      #{set.setNumber}
                    </div>

                    <div className="col-span-3 flex items-center justify-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="0"
                        value={set.actualWeightKg !== undefined ? set.actualWeightKg : set.targetWeightKg}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateSetValue(setIndex, 'actualWeightKg', val);
                        }}
                        className="w-full text-center rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 text-xs font-bold text-white focus:border-lime-400 focus:outline-hidden"
                      />
                    </div>

                    <div className="col-span-2 flex items-center justify-center">
                      <input
                        type="number"
                        min="1"
                        placeholder={String(set.targetReps || '10')}
                        value={
                          set.repsLeft !== undefined
                            ? set.repsLeft
                            : set.actualReps !== undefined
                            ? set.actualReps
                            : set.targetReps
                        }
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateUnilateralReps(setIndex, 'repsLeft', val);
                        }}
                        className="w-full text-center rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 text-xs font-bold text-white focus:border-lime-400 focus:outline-hidden"
                        title="Perna Esquerda"
                      />
                    </div>

                    <div className="col-span-2 flex items-center justify-center">
                      <input
                        type="number"
                        min="1"
                        placeholder={String(set.targetReps || '10')}
                        value={
                          set.repsRight !== undefined
                            ? set.repsRight
                            : set.actualReps !== undefined
                            ? set.actualReps
                            : set.targetReps
                        }
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateUnilateralReps(setIndex, 'repsRight', val);
                        }}
                        className="w-full text-center rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 text-xs font-bold text-white focus:border-lime-400 focus:outline-hidden"
                        title="Perna Direita"
                      />
                    </div>

                    {/* Actions: Concluir & Pular */}
                    <div className="col-span-3 flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleCompleteSet(setIndex)}
                        className={`h-8 flex-1 rounded-lg flex items-center justify-center text-xs font-bold transition active:scale-90 ${
                          set.completed
                            ? 'bg-lime-400 text-zinc-950 shadow-sm'
                            : 'border border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-lime-400 hover:text-white'
                        }`}
                        title={set.completed ? 'Desmarcar conclusão' : 'Concluir série'}
                      >
                        <Check className={`w-3.5 h-3.5 ${set.completed ? 'stroke-[3]' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleSkipSet(setIndex)}
                        className={`h-8 px-1.5 rounded-lg border text-[10px] font-bold transition active:scale-90 ${
                          set.skipped
                            ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                            : 'border-zinc-800 bg-zinc-850 text-zinc-400 hover:text-zinc-200'
                        }`}
                        title={set.skipped ? 'Desfazer pulo da série' : 'Pular série'}
                      >
                        {set.skipped ? 'Pulada' : 'Pular'}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={set.id}
                  className={`grid grid-cols-12 gap-1.5 items-center rounded-xl p-2 border transition-all ${
                    set.completed
                      ? 'border-lime-500/40 bg-lime-500/10'
                      : set.skipped
                      ? 'border-zinc-800 bg-zinc-900/40 opacity-70'
                      : 'border-zinc-800 bg-zinc-950/50'
                  }`}
                >
                  <div className="col-span-2 text-center font-bold text-xs text-zinc-300">
                    #{set.setNumber}
                  </div>

                  <div className="col-span-4 flex items-center justify-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="0"
                      value={set.actualWeightKg !== undefined ? set.actualWeightKg : set.targetWeightKg}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateSetValue(setIndex, 'actualWeightKg', val);
                      }}
                      className="w-full text-center rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 text-xs font-bold text-white focus:border-lime-400 focus:outline-hidden"
                    />
                  </div>

                  <div className="col-span-3 flex items-center justify-center">
                    <input
                      type="number"
                      min="1"
                      placeholder={String(set.targetReps || '10')}
                      value={set.actualReps !== undefined ? set.actualReps : set.targetReps}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateSetValue(setIndex, 'actualReps', val);
                      }}
                      className="w-full text-center rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 text-xs font-bold text-white focus:border-lime-400 focus:outline-hidden"
                    />
                  </div>

                  {/* Actions: Concluir & Pular */}
                  <div className="col-span-3 flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleCompleteSet(setIndex)}
                      className={`h-8 flex-1 rounded-lg flex items-center justify-center text-xs font-bold transition active:scale-90 ${
                        set.completed
                          ? 'bg-lime-400 text-zinc-950 shadow-sm'
                          : 'border border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-lime-400 hover:text-white'
                      }`}
                      title={set.completed ? 'Desmarcar conclusão' : 'Concluir série'}
                    >
                      <Check className={`w-3.5 h-3.5 ${set.completed ? 'stroke-[3]' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleSkipSet(setIndex)}
                      className={`h-8 px-1.5 rounded-lg border text-[10px] font-bold transition active:scale-90 ${
                        set.skipped
                          ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                          : 'border-zinc-800 bg-zinc-850 text-zinc-400 hover:text-zinc-200'
                      }`}
                      title={set.skipped ? 'Desfazer pulo da série' : 'Pular série'}
                    >
                      {set.skipped ? 'Pulada' : 'Pular'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exercise Complete Notice */}
          {isCurrentExerciseDone && (
            <div className="mt-3 rounded-xl border border-lime-500/40 bg-lime-500/10 p-2.5 text-xs font-bold text-lime-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                <span>Todas as séries deste exercício foram finalizadas!</span>
              </span>
              {currentExerciseIndex < exercises.length - 1 && (
                <button
                  onClick={() => handleNavigateExercise(currentExerciseIndex + 1)}
                  className="rounded-lg bg-lime-400 px-2.5 py-1 text-xs font-black text-zinc-950 hover:bg-lime-300 transition shrink-0 ml-2"
                >
                  Próximo Exercício
                </button>
              )}
            </div>
          )}

          {/* Exercise bottom quick options */}
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddSet}
                className="flex items-center gap-1 font-semibold text-lime-400 hover:text-lime-300 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Série</span>
              </button>
              {currentExercise.sets.length > 1 && (
                <button
                  onClick={() => handleRemoveSet(currentExercise.sets.length - 1)}
                  className="flex items-center gap-1 font-semibold text-zinc-400 hover:text-red-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover</span>
                </button>
              )}
            </div>

            {/* Skip whole exercise */}
            <button
              onClick={() => setSkipExerciseConfirmOpen(true)}
              className="flex items-center gap-1 font-semibold text-zinc-400 hover:text-amber-400 transition"
              title="Pular todas as séries pendentes deste exercício"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Pular exercício</span>
            </button>
          </div>
        </div>

        {/* Collapsible Session Notes (Compact at bottom) */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
          <button
            onClick={() => setShowNotes((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-bold text-zinc-400 hover:text-zinc-200 transition"
          >
            <span>Observações da sessão (opcional)</span>
            {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showNotes && (
            <textarea
              value={workoutNotes}
              onChange={(e) => {
                setWorkoutNotes(e.target.value);
                syncSession(exercises, currentExerciseIndex, restTimer);
              }}
              placeholder="Anotações sobre cargas, recuperação ou esforço..."
              rows={2}
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white placeholder-zinc-500 focus:border-lime-400 focus:outline-hidden"
            />
          )}
        </div>
      </main>

      {/* 4. COMPACT FOOTER NAVIGATION (Sticky Bottom) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* Previous Exercise */}
          <button
            onClick={() => handleNavigateExercise(currentExerciseIndex - 1)}
            disabled={currentExerciseIndex === 0}
            className="flex items-center gap-1 h-10 px-3 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-30 disabled:hover:bg-zinc-900 transition active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          {/* Quick Rest 1:30 Standalone Trigger in footer */}
          <button
            onClick={() => handleOpenRestTimer(90)}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-lime-400/40 bg-lime-400/10 text-xs font-black text-lime-400 hover:bg-lime-400/20 transition active:scale-95 shadow-sm"
            title="Abrir descanso de 1 minuto e 30 segundos"
          >
            <Clock className="w-4 h-4 text-lime-400" />
            <span>Descanso 1:30</span>
          </button>

          {/* Next Exercise or Complete Workout */}
          {currentExerciseIndex < exercises.length - 1 ? (
            <button
              onClick={() => handleNavigateExercise(currentExerciseIndex + 1)}
              className="flex items-center gap-1 h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-bold text-white hover:bg-zinc-700 transition active:scale-95"
            >
              <span>Próximo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setConfirmFinishOpen(true)}
              className="flex items-center gap-1 h-10 px-3.5 rounded-xl bg-lime-400 text-xs font-black text-zinc-950 hover:bg-lime-300 transition active:scale-95 shadow-md shadow-lime-950/40"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Finalizar</span>
            </button>
          )}
        </div>
      </footer>

      {/* 5. STANDALONE REST TIMER MODAL */}
      {isRestModalOpen && restTimer && (
        <RestTimer
          key={`rest_${restTimer.exerciseName}_${restTimer.startedAt}`}
          timer={restTimer}
          soundEnabled={settings.soundEnabled}
          vibrationEnabled={settings.vibrationEnabled}
          onUpdateTimer={(updated) => {
            setRestTimer(updated || undefined);
            syncSession(exercises, currentExerciseIndex, updated || undefined);
          }}
          onSkip={handleSkipRestTimer}
          onClose={handleCloseRestModal}
          onFinish={() => {
            // Optional callback when timer hits 0
          }}
        />
      )}

      {/* 6. COMPACT EXERCISES LIST DRAWER / MODAL */}
      {isExercisesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl text-zinc-100 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-lime-400" />
                <h3 className="font-extrabold text-white text-sm">Exercícios da Sessão</h3>
              </div>
              <button
                onClick={() => setIsExercisesDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of session exercises */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
              {exercises.map((ex, index) => {
                const isCurrent = index === currentExerciseIndex;
                const completedCount = ex.sets.filter((s) => s.completed && !s.skipped).length;
                const isAllDone = completedCount === ex.sets.length;

                return (
                  <button
                    key={ex.id}
                    onClick={() => {
                      setCurrentExerciseIndex(index);
                      setIsExercisesDrawerOpen(false);
                      syncSession(exercises, index, restTimer);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl p-3 text-left transition border ${
                      isCurrent
                        ? 'border-lime-400 bg-lime-400/10 text-white font-bold'
                        : isAllDone
                        ? 'border-zinc-800/80 bg-zinc-950/60 text-zinc-300'
                        : 'border-zinc-800 bg-zinc-950/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-white truncate">
                        {index + 1}. {ex.exerciseName}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {completedCount}/{ex.sets.length} séries concluídas
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isAllDone ? (
                        <span className="flex items-center gap-1 rounded bg-lime-400/20 px-2 py-0.5 text-[10px] font-bold text-lime-400">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Feito
                        </span>
                      ) : isCurrent ? (
                        <span className="rounded bg-lime-400 px-2 py-0.5 text-[10px] font-black text-zinc-950">
                          Atual
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-semibold text-zinc-500">
                          {completedCount}/{ex.sets.length}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-800">
              <button
                onClick={() => setIsExercisesDrawerOpen(false)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-850 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation: Discard Workout */}
      <ConfirmationModal
        isOpen={confirmDiscardOpen}
        title="Sair do Treino em Andamento?"
        description="Se você sair agora sem salvar, o treino em andamento será descartado e não ficará registrado no seu histórico."
        confirmLabel="Sim, Descartar"
        cancelLabel="Continuar Treinando"
        isDestructive={true}
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onDiscardWorkout();
        }}
        onCancel={() => setConfirmDiscardOpen(false)}
      />

      {/* Confirmation: Finish Workout */}
      <ConfirmationModal
        isOpen={confirmFinishOpen}
        title="Finalizar e Salvar Treino?"
        description={`Você completou ${completedSetsCount} de ${totalSets} séries em ${formatSecondsToTime(
          elapsedSeconds
        )}. Deseja salvar a sessão no seu histórico?`}
        confirmLabel="Salvar Treino"
        cancelLabel="Revisar Séries"
        isDestructive={false}
        onConfirm={handleConfirmFinish}
        onCancel={() => setConfirmFinishOpen(false)}
      />

      {/* Warning: Incomplete sets on advance */}
      <ConfirmationModal
        isOpen={incompleteSetsWarningOpen}
        title="Avançar com Séries Pendentes?"
        description="O exercício atual possui séries pendentes. Deseja pular as séries restantes deste exercício e avançar para o próximo?"
        confirmLabel="Pular e Avançar"
        cancelLabel="Continuar no Exercício"
        isDestructive={false}
        onConfirm={confirmAdvanceWithIncomplete}
        onCancel={() => {
          setIncompleteSetsWarningOpen(false);
          setPendingNextIndex(null);
        }}
      />

      {/* Confirmation: Skip Exercise */}
      <ConfirmationModal
        isOpen={skipExerciseConfirmOpen}
        title="Pular Exercício Inteiro?"
        description={`Deseja ignorar as séries pendentes de "${currentExercise?.exerciseName}"? Essas séries não contarão como concluídas no volume total.`}
        confirmLabel="Sim, Pular Exercício"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={handleConfirmSkipExercise}
        onCancel={() => setSkipExerciseConfirmOpen(false)}
      />
    </div>
  );
};
