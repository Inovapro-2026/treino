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

  const [isExercisesDrawerOpen, setIsExercisesDrawerOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [incompleteSetsWarningOpen, setIncompleteSetsWarningOpen] = useState(false);
  const [skipExerciseConfirmOpen, setSkipExerciseConfirmOpen] = useState(false);
  const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showExerciseGuidance, setShowExerciseGuidance] = useState(false);

  const [workoutNotes, setWorkoutNotes] = useState<string>(session.notes || '');

  const lastActionTimestamp = useRef<number>(0);

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
  const currentSkippedCount = currentExercise
    ? currentExercise.sets.filter((s) => s.skipped).length
    : 0;
  const currentRemainingPending = currentExercise
    ? currentExercise.sets.filter((s) => !s.completed && !s.skipped).length
    : 0;
  const isCurrentExerciseDone = currentRemainingPending === 0;

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
      // Ignored if confetti is blocked
    }

    onFinishWorkout(newLog);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white overflow-y-auto">
      {/* Compact Top Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-3 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => setConfirmDiscardOpen(true)}
            className="flex items-center justify-center h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition active:scale-95 shrink-0"
            title="Sair ou descartar treino"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 text-center px-1">
            <h1 className="text-xs md:text-sm font-bold text-white truncate tracking-tight">
              {session.routineName || 'Treino em Andamento'}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-0.5 text-[11px] font-mono text-zinc-300">
              <span className="flex items-center gap-1 font-bold">
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

        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-lime-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Waiting to Start Banner */}
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

      {/* Exercise Overview Banner */}
      <section className="max-w-2xl w-full mx-auto px-3 pt-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 flex items-center justify-between gap-2 shadow-sm">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-lime-400">
              Exercício {currentExerciseIndex + 1} de {exercises.length}
            </div>
            <div className="text-xs font-bold text-white truncate">
              {currentExerciseIndex + 1}. {currentExercise.exerciseName}
            </div>
            <div className="text-[11px] text-zinc-300">
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

      {/* MAIN WORKOUT AREA - Cards for each set */}
      <main className="max-w-2xl w-full mx-auto p-3 flex-1 space-y-4 pb-28">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl space-y-4">
          {/* Exercise Header */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800/80">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-lime-400">
                EXERCÍCIO {currentExerciseIndex + 1} DE {exercises.length}
              </span>
              <h2 className="text-lg md:text-xl font-black text-white tracking-tight mt-0.5 truncate">
                {currentExercise.exerciseName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-300">
                <span>{currentExercise.sets.length} séries planejadas</span>
                <span>•</span>
                <span className="font-semibold text-white">
                  {currentExercise.repsRange || '8–12'} repetições
                </span>
                {currentExercise.isUnilateral && (
                  <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                    Unilateral
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleOpenRestTimer(currentExercise.sets[0]?.restSeconds || 90)}
              className="flex items-center gap-1.5 rounded-xl border border-lime-400/30 bg-lime-400/10 px-3 py-1.5 text-xs font-bold text-lime-400 hover:bg-lime-400/20 transition active:scale-95 shrink-0 shadow-sm"
              title="Abrir cronômetro de descanso independente"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Descanso 1:30</span>
            </button>
          </div>

          {/* Previous Session Reference */}
          {previousExercisePerformance && previousExercisePerformance.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-zinc-300 truncate">
                <Award className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span className="text-zinc-400">Última sessão:</span>
                <span className="font-semibold text-white truncate font-mono">
                  {previousExercisePerformance.map((s) => `${s.weightKg}kg × ${s.reps}`).join(' | ')}
                </span>
              </div>
            </div>
          )}

          {/* Exercise Guidance */}
          {currentExercise.notes && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <button
                onClick={() => setShowExerciseGuidance((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition w-full justify-start"
              >
                <Info className="w-3.5 h-3.5 text-lime-400" />
                <span>Orientações técnicas</span>
                {showExerciseGuidance ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showExerciseGuidance && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-xs text-zinc-300"
                >
                  {currentExercise.notes}
                </motion.div>
              )}
            </div>
          )}

          {/* SET CARDS - Individual cards for each set */}
          <div className="space-y-3">
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
                  className={`rounded-2xl border p-4 space-y-3 transition-all duration-200 ${
                    isCompleted
                      ? 'border-lime-400/30 bg-lime-400/5'
                      : isSkipped
                      ? 'border-zinc-800 bg-zinc-950/50 opacity-60'
                      : 'border-zinc-800 bg-zinc-950/50'
                  }`}
                >
                  {/* Set Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-lime-400 font-bold text-xs">
                        {set.setNumber}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Série {set.setNumber}</div>
                        <div className="text-[10px] text-zinc-400">
                          {isCompleted ? 'Concluída' : isSkipped ? 'Pulada' : 'Pendente'}
                        </div>
                      </div>
                    </div>
                    {isCompleted && (
                      <CheckCircle2 className="w-5 h-5 text-lime-400" />
                    )}
                  </div>

                  {/* Weight & Reps Fields - Large touch targets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Weight Field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                        Carga (kg)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={currentWeight ?? ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleUpdateSetValue(setIndex, 'actualWeightKg', e.target.value)}
                        className="w-full h-12 text-center text-xl font-bold text-white bg-zinc-900 border border-zinc-700 rounded-xl focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none placeholder-zinc-500"
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </div>

                    {/* Reps Field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                        Repetições
                      </label>
                      {currentExercise.isUnilateral ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-semibold text-zinc-300 uppercase tracking-wider">Perna E</label>
                            <input
                              type="number"
                              min="1"
                              value={set.repsLeft !== undefined ? set.repsLeft : currentReps ?? ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleUpdateUnilateralReps(setIndex, 'repsLeft', e.target.value)}
                              className="w-full h-12 text-center text-xl font-bold text-white bg-zinc-900 border border-zinc-700 rounded-xl focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none placeholder-zinc-500"
                              placeholder={String(set.targetReps || '10')}
                              inputMode="numeric"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-semibold text-zinc-300 uppercase tracking-wider">Perna D</label>
                            <input
                              type="number"
                              min="1"
                              value={set.repsRight !== undefined ? set.repsRight : currentReps ?? ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleUpdateUnilateralReps(setIndex, 'repsRight', e.target.value)}
                              className="w-full h-12 text-center text-xl font-bold text-white bg-zinc-900 border border-zinc-700 rounded-xl focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none placeholder-zinc-500"
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
                          className="w-full h-12 text-center text-xl font-bold text-white bg-zinc-900 border border-zinc-700 rounded-xl focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none placeholder-zinc-500"
                          placeholder={String(set.targetReps || '10')}
                          inputMode="numeric"
                        />
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleCompleteSet(setIndex)}
                      disabled={isCompleted}
                      className={`flex-1 h-11 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] ${
                        isCompleted
                          ? 'bg-lime-400 text-zinc-950 shadow-lg shadow-lime-950/30'
                          : 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 hover:border-lime-400/50'
                      }`}
                      title={isCompleted ? 'Série já concluída' : 'Concluir série'}
                    >
                      {isCompleted ? (
                        <>
                          <Check className="w-4 h-4 mr-1 stroke-[3]" />
                          Concluída
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Concluir
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSkipSet(setIndex)}
                      className={`flex-1 h-11 rounded-xl font-bold text-xs border transition-all duration-200 active:scale-[0.98] ${
                        isSkipped
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                          : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      }`}
                      title={isSkipped ? 'Desfazer pulo' : 'Pular série'}
                    >
                      {isSkipped ? 'Pulada' : 'Pular'}
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
              className="rounded-xl border border-lime-400/30 bg-lime-400/5 p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-lime-400 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Todas as séries concluídas!</span>
              </div>
              {currentExerciseIndex < exercises.length - 1 && (
                <button
                  onClick={() => handleNavigateExercise(currentExerciseIndex + 1)}
                  className="rounded-lg bg-lime-400 px-3 py-1.5 text-xs font-black text-zinc-950 hover:bg-lime-300 transition shrink-0"
                >
                  Próximo Exercício
                </button>
              )}
            </motion.div>
          )}

          {/* Exercise Bottom Options */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddSet}
                className="flex items-center gap-1 text-xs font-semibold text-lime-400 hover:text-lime-300 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar série</span>
              </button>
              {currentExercise.sets.length > 1 && (
                <button
                  onClick={() => handleRemoveSet(currentExercise.sets.length - 1)}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-red-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover última</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setSkipExerciseConfirmOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-amber-400 transition"
              title="Pular todas as séries pendentes"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Pular exercício</span>
            </button>
          </div>
        </div>

        {/* Session Notes */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
          <button
            onClick={() => setShowNotes((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white transition"
          >
            <span>Observações da sessão</span>
            {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white placeholder-zinc-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20 outline-none"
            />
          )}
        </div>
      </main>

      {/* Sticky Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-2.5 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => handleNavigateExercise(currentExerciseIndex - 1)}
            disabled={currentExerciseIndex === 0}
            className="flex items-center gap-1 h-10 px-3 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-30 disabled:hover:bg-zinc-900 transition active:scale-95 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <button
            onClick={() => handleOpenRestTimer(90)}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-lime-400/40 bg-lime-400/10 text-xs font-black text-lime-400 hover:bg-lime-400/20 transition active:scale-95 shadow-sm"
            title="Abrir descanso de 1 minuto e 30 segundos"
          >
            <Clock className="w-4 h-4 text-lime-400" />
            <span>Descanso 1:30</span>
          </button>

          {currentExerciseIndex < exercises.length - 1 ? (
            <button
              onClick={() => handleNavigateExercise(currentExerciseIndex + 1)}
              className="flex items-center gap-1 h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-bold text-white hover:bg-zinc-700 transition active:scale-95 shrink-0"
            >
              <span>Próximo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setConfirmFinishOpen(true)}
              className="flex items-center gap-1 h-10 px-3.5 rounded-xl bg-lime-400 text-xs font-black text-zinc-950 hover:bg-lime-300 transition active:scale-95 shadow-md shadow-lime-950/40 shrink-0"
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

      {/* Exercises Drawer */}
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
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl text-white max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
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
                        : 'border-zinc-800 bg-zinc-950/30 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-white truncate">
                        {index + 1}. {ex.exerciseName}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {completedCount}/{ex.sets.length} séries
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
                        <span className="text-[10px] font-mono font-semibold text-zinc-400">
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
          </motion.div>
        </motion.div>
      )}

      {/* Confirmation Modals */}
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