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
  ArrowRightLeft,
  ArrowLeft,
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
import { motion, AnimatePresence } from 'motion/react';

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
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isWorkoutPaused, setIsWorkoutPaused] = useState<boolean>(!!session.pausedAt);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(
    session.currentExerciseIndex || 0
  );
  const [exercises, setExercises] = useState<WorkoutExercise[]>(session.exercises);
  const [restTimer, setRestTimer] = useState<ActiveRestTimer | undefined>(session.restTimer);
  const [isRestModalOpen, setIsRestModalOpen] = useState<boolean>(!!session.restTimer?.active);

  // Drawers and Modals
  const [isExercisesDrawerOpen, setIsExercisesDrawerOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [incompleteSetsWarningOpen, setIncompleteSetsWarningOpen] = useState(false);
  const [skipExerciseConfirmOpen, setSkipExerciseConfirmOpen] = useState(false);
  const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showExerciseGuidance, setShowExerciseGuidance] = useState(false);

  // Toast / feedback message for occupied equipment action
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'info';
    message: string;
  } | null>(null);

  const [workoutNotes, setWorkoutNotes] = useState<string>(session.notes || '');
  const lastActionTimestamp = useRef<number>(0);

  // Elapsed timer computation
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

  // Sync session changes back to parent & storage
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

  const totalSets = useMemo(
    () => exercises.reduce((acc, ex) => acc + ex.sets.length, 0),
    [exercises]
  );
  const completedSetsCount = useMemo(
    () => exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed && !s.skipped).length, 0),
    [exercises]
  );
  const progressPercent = totalSets > 0 ? Math.round((completedSetsCount / totalSets) * 100) : 0;

  const currentCompletedCount = currentExercise
    ? currentExercise.sets.filter((s) => s.completed && !s.skipped).length
    : 0;
  const currentRemainingPending = currentExercise
    ? currentExercise.sets.filter((s) => !s.completed && !s.skipped).length
    : 0;
  const isCurrentExerciseDone = currentRemainingPending === 0;

  // Start workout timer explicitly
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

  // Set Completion Handler
  const handleCompleteSet = (setIndex: number) => {
    const now = Date.now();
    if (now - lastActionTimestamp.current < 250) return;
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

  // Skip Set Handler
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
          completed: false,
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

  // FUNCIONALIDADE 1: MÁQUINA OCUPADA — PRÓXIMO EXERCÍCIO
  const handlePostponeOccupiedMachine = () => {
    const now = Date.now();
    if (now - lastActionTimestamp.current < 400) return;
    lastActionTimestamp.current = now;

    const current = exercises[currentExerciseIndex];
    if (!current) return;

    // An exercise has pending sets if at least one set is neither completed nor skipped
    const hasPendingSets = (ex: WorkoutExercise) =>
      ex.sets.some((s) => !s.completed && !s.skipped);

    // Find other pending exercises in the current queue
    const otherPending = exercises.filter(
      (ex, idx) => idx !== currentExerciseIndex && hasPendingSets(ex)
    );

    if (otherPending.length === 0) {
      setFeedbackBanner({
        type: 'info',
        message: 'Não há outro exercício pendente na fila no momento.',
      });
      setTimeout(() => setFeedbackBanner(null), 3500);
      return;
    }

    // Mark current exercise as postponed by busy equipment, preserving all completed sets
    const postponedExercise: WorkoutExercise = {
      ...current,
      isPostponed: true,
    };

    // Remove current exercise from its position
    const remaining = exercises.filter((_, idx) => idx !== currentExerciseIndex);

    // Place temporarily at the end of the pending exercises queue
    let lastPendingIdx = -1;
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (hasPendingSets(remaining[i])) {
        lastPendingIdx = i;
        break;
      }
    }

    const newExercises = [...remaining];
    if (lastPendingIdx >= 0) {
      newExercises.splice(lastPendingIdx + 1, 0, postponedExercise);
    } else {
      newExercises.push(postponedExercise);
    }

    // Automatically navigate to the first pending exercise in new queue
    const nextPendingIdx = newExercises.findIndex((ex) => hasPendingSets(ex));
    const newActiveIndex = nextPendingIdx >= 0 ? nextPendingIdx : 0;

    setExercises(newExercises);
    setCurrentExerciseIndex(newActiveIndex);

    // Save temporary reordered session to storage
    syncSession(newExercises, newActiveIndex, restTimer);

    if (settings.vibrationEnabled) triggerHaptic([60, 50, 60]);

    setFeedbackBanner({
      type: 'success',
      message: `"${current.exerciseName}" foi adiado para o final da fila de exercícios pendentes.`,
    });
    setTimeout(() => setFeedbackBanner(null), 3500);
  };

  // Confirm Skipping Whole Exercise
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

    if (currentExerciseIndex < exercises.length - 1) {
      const nextIdx = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIdx);
      syncSession(updatedExercises, nextIdx, restTimer);
    } else {
      syncSession(updatedExercises, currentExerciseIndex, restTimer);
    }
  };

  // Rest Timer Controls
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

  const handleCloseRestModal = () => {
    setIsRestModalOpen(false);
  };

  const handleSkipRestTimer = () => {
    setIsRestModalOpen(false);
    setRestTimer(undefined);
    syncSession(exercises, currentExerciseIndex, undefined);
  };

  // Set Field Values
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

  // Exercise Navigation
  const handleNavigateExercise = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    if (targetIndex > currentExerciseIndex) {
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

  // Pause / Resume Session
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

  // Finish Workout
  const handleConfirmFinish = () => {
    setConfirmFinishOpen(false);

    let totalVolume = 0;
    let completedSetsTotal = 0;

    const completedExercisesLog = exercises
      .map((ex) => {
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
      // Ignored
    }

    onFinishWorkout(newLog);
  };

  // Helper to get comprehensive status for an exercise in "Ver todos os exercícios"
  const getExerciseStatusInfo = (ex: WorkoutExercise, index: number) => {
    const allCompleted = ex.sets.length > 0 && ex.sets.every((s) => s.completed);
    if (allCompleted) {
      return {
        key: 'concluido',
        label: 'Concluído',
        badgeClass: 'bg-lime-400 text-zinc-950 font-bold',
      };
    }

    const allSkipped = ex.sets.length > 0 && ex.sets.every((s) => s.skipped);
    if (allSkipped) {
      return {
        key: 'pulado',
        label: 'Pulado',
        badgeClass: 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40',
      };
    }

    if (ex.isPostponed) {
      return {
        key: 'adiado',
        label: 'Adiado por equipamento ocupado',
        badgeClass: 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40',
      };
    }

    const someCompleted = ex.sets.some((s) => s.completed || s.skipped);
    if (index === currentExerciseIndex || someCompleted) {
      return {
        key: 'em_andamento',
        label: 'Em andamento',
        badgeClass: 'bg-lime-400/20 text-lime-400 font-bold border border-lime-400/30',
      };
    }

    return {
      key: 'pendente',
      label: 'Pendente',
      badgeClass: 'bg-zinc-800 text-white font-semibold border border-zinc-700',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white overflow-y-auto overflow-x-hidden">
      {/* Top Bar with Workout Name, Timer, and Discard Action */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-3 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* FUNCIONALIDADE 3: DESCARTAR TREINO BUTTON (Header placement) */}
          <button
            onClick={() => setConfirmDiscardOpen(true)}
            className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-white text-xs font-bold transition active:scale-95 shrink-0"
            title="Descartar treino"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">Descartar treino</span>
            <span className="sm:hidden">Descartar</span>
          </button>

          {/* Session Title & Timer */}
          <div className="flex-1 min-w-0 text-center px-1">
            <h1 className="text-sm md:text-base font-extrabold text-white truncate tracking-tight">
              {session.routineName || 'Treino em Andamento'}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-0.5 text-xs font-mono text-white">
              <span className="flex items-center gap-1 font-bold">
                <Clock className="w-3.5 h-3.5 text-lime-400" />
                {formatSecondsToTime(elapsedSeconds)}
              </span>
              <span className="text-white font-bold">•</span>
              <span className="font-bold text-lime-400">
                {completedSetsCount}/{totalSets} séries
              </span>
              {isWorkoutPaused && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 uppercase">
                  Pausado
                </span>
              )}
            </div>
          </div>

          {/* Pause & Finish buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleWorkoutPause}
              className={`flex items-center justify-center h-10 w-10 rounded-xl border transition active:scale-95 ${
                isWorkoutPaused
                  ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold'
                  : 'bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800'
              }`}
              title={isWorkoutPaused ? 'Retomar treino' : 'Pausar treino'}
            >
              {isWorkoutPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setConfirmFinishOpen(true)}
              className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-lime-400 text-zinc-950 font-extrabold text-xs hover:bg-lime-300 transition active:scale-95 shadow-md shadow-lime-950/40"
              title="Finalizar e salvar treino"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span className="hidden xs:inline">Concluir</span>
            </button>
          </div>
        </div>

        {/* Overall Workout Progress Bar */}
        <div className="max-w-2xl mx-auto mt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-lime-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Postpone Feedback Banner */}
      <AnimatePresence>
        {feedbackBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl w-full mx-auto px-3 pt-3"
          >
            <div
              className={`rounded-xl border p-3 flex items-center justify-between gap-3 shadow-lg ${
                feedbackBanner.type === 'success'
                  ? 'border-lime-400/40 bg-zinc-900 text-white'
                  : 'border-amber-400/40 bg-zinc-900 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft
                  className={`w-5 h-5 shrink-0 ${
                    feedbackBanner.type === 'success' ? 'text-lime-400' : 'text-amber-400'
                  }`}
                />
                <p className="text-xs font-bold text-white leading-snug">
                  {feedbackBanner.message}
                </p>
              </div>
              <button
                onClick={() => setFeedbackBanner(null)}
                className="p-1 rounded-lg text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting to Start Banner */}
      {session.isStarted === false && (
        <div className="max-w-2xl w-full mx-auto px-3 pt-3">
          <div className="rounded-2xl border border-lime-400/40 bg-zinc-900 p-4 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-zinc-950 font-bold">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <p className="text-xs font-bold text-white">
                O cronômetro inicia ao tocar em <strong>Iniciar</strong> ou concluir a 1ª série.
              </p>
            </div>
            <button
              onClick={handleStartWorkoutTimer}
              className="min-h-[52px] h-[52px] px-5 shrink-0 rounded-xl bg-lime-400 text-sm font-black text-zinc-950 hover:bg-lime-300 transition flex items-center justify-center shadow-md shadow-lime-950/40"
            >
              Iniciar Treino
            </button>
          </div>
        </div>
      )}

      {/* ACTION CONTROLS: "Máquina Ocupada" & "Ver todos os exercícios" */}
      <section className="max-w-2xl w-full mx-auto px-3 pt-3 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* FUNCIONALIDADE 1: MÁQUINA OCUPADA — PRÓXIMO EXERCÍCIO */}
          <button
            onClick={handlePostponeOccupiedMachine}
            className="w-full min-h-[52px] h-[52px] px-4 rounded-xl border-2 border-amber-400/50 bg-amber-400/10 hover:bg-amber-400/20 text-white font-bold text-sm transition active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-md shadow-black/40"
            title="Adiar este exercício para o final da fila de pendentes"
          >
            <ArrowRightLeft className="w-5 h-5 text-lime-400 shrink-0" />
            <span className="truncate">Máquina ocupada — Próximo exercício</span>
          </button>

          {/* FUNCIONALIDADE 2: VER TODOS OS EXERCÍCIOS */}
          <button
            onClick={() => setIsExercisesDrawerOpen(true)}
            className="w-full min-h-[52px] h-[52px] px-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-sm transition active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-md shadow-black/40"
            title="Ver a lista de todos os exercícios da sessão"
          >
            <List className="w-5 h-5 text-lime-400 shrink-0" />
            <span className="truncate">Ver todos os exercícios</span>
          </button>
        </div>
      </section>

      {/* MAIN WORKOUT AREA - Focused Current Exercise Card */}
      <main className="max-w-2xl w-full mx-auto p-3 flex-1 space-y-4 pb-36">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl space-y-5">
          {/* Exercise Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-800">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-lime-400">
                  EXERCÍCIO {currentExerciseIndex + 1} DE {exercises.length}
                </span>
                {currentExercise.isPostponed && (
                  <span className="rounded bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                    Adiado anteriormente
                  </span>
                )}
              </div>

              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1 truncate">
                {currentExercise.exerciseName}
              </h2>

              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-white font-semibold">
                <span>{currentExercise.sets.length} séries planejadas</span>
                <span>•</span>
                <span className="text-lime-400 font-bold">
                  {currentExercise.repsRange || '8–12'} repetições
                </span>
                {currentExercise.targetMuscleGroup && (
                  <>
                    <span>•</span>
                    <span className="capitalize">
                      {MUSCLE_GROUP_LABELS[currentExercise.targetMuscleGroup] || currentExercise.targetMuscleGroup}
                    </span>
                  </>
                )}
                {currentExercise.isUnilateral && (
                  <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                    Unilateral
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleOpenRestTimer(currentExercise.sets[0]?.restSeconds || 90)}
              className="min-h-[52px] h-[52px] px-3.5 flex items-center gap-2 rounded-xl border border-lime-400/40 bg-lime-400/10 text-xs font-bold text-lime-400 hover:bg-lime-400/20 transition active:scale-95 shrink-0 shadow-sm"
              title="Abrir cronômetro de descanso independente"
            >
              <Clock className="w-4 h-4 text-lime-400" />
              <span>Descanso 1:30</span>
            </button>
          </div>

          {/* Previous Session Reference */}
          {previousExercisePerformance && previousExercisePerformance.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white truncate">
                <Award className="w-4 h-4 text-lime-400 shrink-0" />
                <span className="font-bold text-white">Última sessão:</span>
                <span className="font-bold text-lime-400 truncate font-mono">
                  {previousExercisePerformance.map((s) => `${s.weightKg}kg × ${s.reps}`).join(' | ')}
                </span>
              </div>
            </div>
          )}

          {/* Exercise Guidance / Technical Notes */}
          {currentExercise.notes && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5">
              <button
                onClick={() => setShowExerciseGuidance((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-bold text-white hover:text-lime-400 transition w-full justify-start"
              >
                <Info className="w-4 h-4 text-lime-400" />
                <span>Orientações técnicas</span>
                {showExerciseGuidance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showExerciseGuidance && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                  className="mt-2.5 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-white leading-relaxed"
                >
                  {currentExercise.notes}
                </motion.div>
              )}
            </div>
          )}

          {/* SET CARDS - Individual cards for each set with large controls */}
          <div className="space-y-3.5">
            {currentExercise.sets.map((set, setIndex) => {
              const currentWeight =
                set.actualWeightKg !== undefined ? set.actualWeightKg : set.targetWeightKg;
              const currentReps =
                set.actualReps !== undefined ? set.actualReps : set.targetReps;

              const isCompleted = set.completed;
              const isSkipped = set.skipped;

              return (
                <motion.div
                  key={set.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: setIndex * 0.05 }}
                  className={`rounded-2xl border p-4 space-y-3.5 transition-all duration-200 ${
                    isCompleted
                      ? 'border-lime-400/40 bg-lime-400/10'
                      : isSkipped
                      ? 'border-zinc-800 bg-zinc-950/70 opacity-60'
                      : 'border-zinc-800 bg-zinc-950'
                  }`}
                >
                  {/* Set Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-lime-400 font-extrabold text-sm">
                        #{set.setNumber}
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-white tracking-wide">
                          Série {set.setNumber}
                        </div>
                        <div className="text-xs font-bold text-white">
                          {isCompleted ? (
                            <span className="text-lime-400">Concluída</span>
                          ) : isSkipped ? (
                            <span className="text-amber-400">Pulada</span>
                          ) : (
                            <span className="text-white">Pendente</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isCompleted && <CheckCircle2 className="w-6 h-6 text-lime-400 stroke-[2.5]" />}
                  </div>

                  {/* Weight & Reps Fields with minimum 52px height */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Weight Field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-white uppercase tracking-wider">
                        Carga (kg)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={currentWeight ?? ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleUpdateSetValue(setIndex, 'actualWeightKg', e.target.value)}
                        className="w-full min-h-[52px] h-[52px] text-center text-2xl font-black text-white bg-zinc-900 border-2 border-zinc-700 rounded-xl focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none placeholder:text-zinc-500 transition"
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </div>

                    {/* Reps Field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-white uppercase tracking-wider">
                        Repetições
                      </label>
                      {currentExercise.isUnilateral ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                              Perna E
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={set.repsLeft !== undefined ? set.repsLeft : currentReps ?? ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleUpdateUnilateralReps(setIndex, 'repsLeft', e.target.value)}
                              className="w-full min-h-[52px] h-[52px] text-center text-xl font-black text-white bg-zinc-900 border-2 border-zinc-700 rounded-xl focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none placeholder:text-zinc-500 transition"
                              placeholder={String(set.targetReps || '10')}
                              inputMode="numeric"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                              Perna D
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={set.repsRight !== undefined ? set.repsRight : currentReps ?? ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleUpdateUnilateralReps(setIndex, 'repsRight', e.target.value)}
                              className="w-full min-h-[52px] h-[52px] text-center text-xl font-black text-white bg-zinc-900 border-2 border-zinc-700 rounded-xl focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none placeholder:text-zinc-500 transition"
                              placeholder={String(set.targetReps || '10')}
                              inputMode="numeric"
                            />
                          </div>
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={currentReps ?? ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdateSetValue(setIndex, 'actualReps', e.target.value)}
                          className="w-full min-h-[52px] h-[52px] text-center text-2xl font-black text-white bg-zinc-900 border-2 border-zinc-700 rounded-xl focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none placeholder:text-zinc-500 transition"
                          placeholder={String(set.targetReps || '10')}
                          inputMode="numeric"
                        />
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Concluir & Pular (min 52px height) */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => handleCompleteSet(setIndex)}
                      disabled={isCompleted}
                      className={`min-h-[52px] h-[52px] rounded-xl font-extrabold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
                        isCompleted
                          ? 'bg-lime-400 text-zinc-950 shadow-lg shadow-lime-950/40'
                          : 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-750 hover:border-lime-400/50'
                      }`}
                      title={isCompleted ? 'Série já concluída' : 'Concluir série'}
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>{isCompleted ? 'Concluída' : 'Concluir'}</span>
                    </button>

                    <button
                      onClick={() => handleSkipSet(setIndex)}
                      className={`min-h-[52px] h-[52px] rounded-xl font-bold text-sm border transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
                        isSkipped
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-750'
                      }`}
                      title={isSkipped ? 'Desfazer pulo' : 'Pular série'}
                    >
                      <span>{isSkipped ? 'Desfazer pulo' : 'Pular série'}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Exercise Complete Notice */}
          {isCurrentExerciseDone && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-lime-400/40 bg-lime-400/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-2.5 text-lime-400 font-bold text-sm">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                <span>Todas as séries deste exercício concluídas!</span>
              </div>
              {currentExerciseIndex < exercises.length - 1 && (
                <button
                  onClick={() => handleNavigateExercise(currentExerciseIndex + 1)}
                  className="min-h-[52px] h-[52px] px-6 rounded-xl bg-lime-400 text-sm font-black text-zinc-950 hover:bg-lime-300 transition shrink-0 flex items-center justify-center gap-2 shadow-md shadow-lime-950/40"
                >
                  <span>Próximo Exercício</span>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              )}
            </motion.div>
          )}

          {/* Exercise Bottom Options */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddSet}
                className="flex items-center gap-1.5 text-xs font-bold text-lime-400 hover:text-lime-300 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar série</span>
              </button>
              {currentExercise.sets.length > 1 && (
                <button
                  onClick={() => handleRemoveSet(currentExercise.sets.length - 1)}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remover última</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setSkipExerciseConfirmOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              title="Pular todas as séries pendentes"
            >
              <FastForward className="w-4 h-4" />
              <span>Pular exercício</span>
            </button>
          </div>
        </div>

        {/* Session Notes */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg">
          <button
            onClick={() => setShowNotes((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-bold text-white hover:text-lime-400 transition"
          >
            <span>Observações da sessão</span>
            {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showNotes && (
            <motion.textarea
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              value={workoutNotes}
              onChange={(e) => {
                setWorkoutNotes(e.target.value);
                syncSession(exercises, currentExerciseIndex, restTimer);
              }}
              placeholder="Anotações sobre cargas, recuperação ou esforço..."
              rows={2}
              className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-xs font-semibold text-white placeholder:text-zinc-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none"
            />
          )}
        </div>
      </main>

      {/* Sticky Bottom Navigation - Large 52px touch buttons */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-3 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2.5">
          <button
            onClick={() => handleNavigateExercise(currentExerciseIndex - 1)}
            disabled={currentExerciseIndex === 0}
            className="min-h-[52px] h-[52px] px-4 rounded-xl border border-zinc-700 bg-zinc-850 text-xs sm:text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-850 transition active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <button
            onClick={() => handleOpenRestTimer(90)}
            className="flex-1 min-h-[52px] h-[52px] px-3 rounded-xl border border-lime-400/40 bg-lime-400/10 text-xs sm:text-sm font-extrabold text-lime-400 hover:bg-lime-400/20 transition active:scale-95 flex items-center justify-center gap-2 shadow-sm"
            title="Abrir descanso de 1 minuto e 30 segundos"
          >
            <Clock className="w-4 h-4 text-lime-400" />
            <span>Descanso 1:30</span>
          </button>

          {currentExerciseIndex < exercises.length - 1 ? (
            <button
              onClick={() => handleNavigateExercise(currentExerciseIndex + 1)}
              className="min-h-[52px] h-[52px] px-4 rounded-xl border border-zinc-600 bg-zinc-800 text-xs sm:text-sm font-bold text-white hover:bg-zinc-700 transition active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
            >
              <span>Próximo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setConfirmFinishOpen(true)}
              className="min-h-[52px] h-[52px] px-5 rounded-xl bg-lime-400 text-xs sm:text-sm font-black text-zinc-950 hover:bg-lime-300 transition active:scale-95 shadow-lg shadow-lime-950/40 shrink-0 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Finalizar</span>
            </button>
          )}
        </div>
      </footer>

      {/* Rest Timer Modal */}
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
          onFinish={() => {}}
        />
      )}

      {/* FUNCIONALIDADE 2: MODAL "VER TODOS OS EXERCÍCIOS" */}
      <AnimatePresence>
        {isExercisesDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4"
            onClick={() => setIsExercisesDrawerOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl text-white max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/20 text-lime-400 font-bold">
                    <List className="w-5 h-5 text-lime-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Exercícios da Sessão</h3>
                    <p className="text-xs font-semibold text-white">
                      {completedSetsCount}/{totalSets} séries concluídas
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExercisesDrawerOpen(false)}
                  className="p-2 rounded-xl text-white hover:bg-zinc-800 transition"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Exercises List */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
                {exercises.map((ex, index) => {
                  const isCurrent = index === currentExerciseIndex;
                  const completedCount = ex.sets.filter((s) => s.completed && !s.skipped).length;
                  const statusInfo = getExerciseStatusInfo(ex, index);

                  return (
                    <button
                      key={ex.id || `ex_${index}`}
                      onClick={() => {
                        setCurrentExerciseIndex(index);
                        setIsExercisesDrawerOpen(false);
                        syncSession(exercises, index, restTimer);
                      }}
                      className={`w-full flex items-center justify-between rounded-2xl p-4 text-left transition-all duration-150 border active:scale-[0.99] ${
                        isCurrent
                          ? 'border-2 border-lime-400 bg-lime-400/15 text-white shadow-lg shadow-lime-950/40'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-white'
                      }`}
                    >
                      <div className="min-w-0 pr-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-lime-400">
                            #{index + 1}
                          </span>
                          <h4 className="text-sm font-extrabold text-white truncate">
                            {ex.exerciseName}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-white font-medium">
                          {ex.targetMuscleGroup && (
                            <span className="capitalize">
                              {MUSCLE_GROUP_LABELS[ex.targetMuscleGroup] || ex.targetMuscleGroup}
                            </span>
                          )}
                          <span>•</span>
                          <span>{ex.sets.length} séries planejadas</span>
                          <span>•</span>
                          <span className="text-lime-400 font-bold">{ex.repsRange || '8–12 reps'}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${statusInfo.badgeClass}`}
                        >
                          {statusInfo.label}
                        </span>
                        <span className="text-xs font-mono font-bold text-white">
                          {completedCount}/{ex.sets.length} séries
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Drawer Footer with large "Voltar ao treino" button */}
              <div className="pt-3 border-t border-zinc-800">
                <button
                  onClick={() => setIsExercisesDrawerOpen(false)}
                  className="w-full min-h-[52px] h-[52px] rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-sm transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-lime-950/40"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                  <span>Voltar ao treino</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FUNCIONALIDADE 3: CONFIRMAÇÃO DE DESCARTAR TREINO */}
      <ConfirmationModal
        isOpen={confirmDiscardOpen}
        title="Descartar este treino?"
        description="O treino em andamento será descartado. Deseja continuar?"
        confirmLabel="Descartar treino"
        cancelLabel="Continuar treinando"
        isDestructive={true}
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onDiscardWorkout();
        }}
        onCancel={() => setConfirmDiscardOpen(false)}
      />

      {/* Confirmation to finish workout */}
      <ConfirmationModal
        isOpen={confirmFinishOpen}
        title="Finalizar e Salvar Treino?"
        description={`Você completou ${completedSetsCount} de ${totalSets} séries em ${formatSecondsToTime(elapsedSeconds)}. Deseja salvar a sessão no seu histórico?`}
        confirmLabel="Salvar Treino"
        cancelLabel="Revisar Séries"
        isDestructive={false}
        onConfirm={handleConfirmFinish}
        onCancel={() => setConfirmFinishOpen(false)}
      />

      {/* Confirmation to advance with unfinished sets */}
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

      {/* Confirmation to skip whole exercise */}
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