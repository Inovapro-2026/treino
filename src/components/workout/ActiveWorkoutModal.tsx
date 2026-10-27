import React, { useState, useEffect, useRef } from 'react';
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

  // Modals & confirmation dialogs
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [incompleteSetsWarningOpen, setIncompleteSetsWarningOpen] = useState(false);
  const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null);

  // Notes state
  const [workoutNotes, setWorkoutNotes] = useState<string>(session.notes || '');

  // Calculate elapsed time from start timestamp
  useEffect(() => {
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
  }, [session.startTime, session.pausedAt, session.totalPausedDurationMs]);

  // Sync state back to storage automatically on every change
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
  const previousExercisePerformance = React.useMemo(() => {
    if (!currentExercise) return null;
    for (const log of previousLogs) {
      const matched = log.exercises.find((e) => e.exerciseId === currentExercise.exerciseId);
      if (matched && matched.completedSets.length > 0) {
        return matched.completedSets;
      }
    }
    return null;
  }, [currentExercise, previousLogs]);

  // Overall workout progress
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSetsCount = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const progressPercent = totalSets > 0 ? Math.round((completedSetsCount / totalSets) * 100) : 0;

  // Toggle set completion
  const handleToggleSet = (setIndex: number) => {
    const set = currentExercise.sets[setIndex];
    const willBeCompleted = !set.completed;

    const updatedSets = currentExercise.sets.map((s, idx) => {
      if (idx === setIndex) {
        return {
          ...s,
          completed: willBeCompleted,
          actualReps: s.actualReps !== undefined ? s.actualReps : s.targetReps,
          actualWeightKg: s.actualWeightKg !== undefined ? s.actualWeightKg : s.targetWeightKg,
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
      if (settings.vibrationEnabled) triggerHaptic(80);

      // Auto start rest timer
      if (settings.autoStartRest) {
        const restDuration = set.restSeconds || settings.defaultRestSeconds || 90;
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
        syncSession(updatedExercises, currentExerciseIndex, newTimer);
        return;
      }
    }

    syncSession(updatedExercises, currentExerciseIndex, restTimer);
  };

  // Update set weight and reps dynamically
  const handleUpdateSetValue = (
    setIndex: number,
    field: 'targetWeightKg' | 'actualWeightKg' | 'targetReps' | 'actualReps',
    value: number
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

  // Add a new set to the current exercise
  const handleAddSet = () => {
    const lastSet = currentExercise.sets[currentExercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: `set_${Date.now()}`,
      setNumber: currentExercise.sets.length + 1,
      targetReps: lastSet ? lastSet.targetReps : 10,
      targetWeightKg: lastSet ? lastSet.targetWeightKg : 20,
      restSeconds: lastSet ? lastSet.restSeconds : settings.defaultRestSeconds || 90,
      completed: false,
    };

    const updatedSets = [...currentExercise.sets, newSet];
    const updatedExercises = exercises.map((ex, idx) =>
      idx === currentExerciseIndex ? { ...ex, sets: updatedSets } : ex
    );

    setExercises(updatedExercises);
    syncSession(updatedExercises, currentExerciseIndex, restTimer);
  };

  // Remove set
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

    // Check if current exercise has uncompleted sets when moving forward
    if (targetIndex > currentExerciseIndex) {
      const hasUnfinishedSets = currentExercise.sets.some((s) => !s.completed);
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
      setCurrentExerciseIndex(pendingNextIndex);
      syncSession(exercises, pendingNextIndex, restTimer);
      setPendingNextIndex(null);
    }
    setIncompleteSetsWarningOpen(false);
  };

  // Workout pause toggle
  const handleToggleWorkoutPause = () => {
    if (isWorkoutPaused) {
      // Resume workout
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
      // Pause workout
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

    // Calculate volume and completed exercises
    let totalVolume = 0;
    let completedSetsTotal = 0;

    const completedExercisesLog = exercises
      .map((ex) => {
        const completedSets = ex.sets
          .filter((s) => s.completed)
          .map((s) => {
            const weight = s.actualWeightKg !== undefined ? s.actualWeightKg : s.targetWeightKg;
            const reps = s.actualReps !== undefined ? s.actualReps : s.targetReps;
            totalVolume += weight * reps;
            completedSetsTotal += 1;
            return {
              setNumber: s.setNumber,
              weightKg: weight,
              reps: reps,
            };
          });

        return {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          targetMuscleGroup: ex.targetMuscleGroup,
          completedSets,
        };
      })
      .filter((ex) => ex.completedSets.length > 0);

    const log: WorkoutLog = {
      id: `log_${Date.now()}`,
      routineId: session.routineId,
      routineName: session.routineName,
      date: new Date().toISOString(),
      durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      totalVolumeKg: totalVolume,
      totalSetsCompleted: completedSetsTotal,
      exercises: completedExercisesLog,
      notes: workoutNotes,
    };

    // Trigger celebration effects
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a3e635', '#ffffff', '#22c55e', '#facc15'],
      });
    } catch (e) {
      // Confetti fallback
    }

    if (settings.soundEnabled) playCompleteChime();
    if (settings.vibrationEnabled) triggerHaptic([100, 50, 100, 50, 200]);

    onFinishWorkout(log);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 overflow-y-auto">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfirmDiscardOpen(true)}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              title="Encerrar ou descartar treino"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                </span>
                <h1 className="text-sm md:text-base font-bold text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                  {session.routineName}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                <span className="flex items-center gap-1 font-mono font-medium text-lime-400">
                  <Clock className="w-3.5 h-3.5" />
                  {formatSecondsToTime(elapsedSeconds)}
                </span>
                <span>•</span>
                <span>
                  {completedSetsCount}/{totalSets} séries
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleWorkoutPause}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                isWorkoutPaused
                  ? 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
                  : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
              title={isWorkoutPaused ? 'Retomar treino' : 'Pausar treino'}
            >
              {isWorkoutPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Retomar</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar</span>
                </>
              )}
            </button>

            <button
              onClick={() => setConfirmFinishOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-lime-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950 transition hover:bg-lime-300 active:scale-95 shadow-sm shadow-lime-950/30"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Concluir</span>
            </button>
          </div>
        </div>

        {/* Workout Progress Bar */}
        <div className="max-w-4xl mx-auto mt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-lime-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 pb-28 md:pb-12 space-y-5">
        {/* Rest Timer Panel (when active) */}
        {restTimer && restTimer.active && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-200">
            <RestTimer
              timer={restTimer}
              soundEnabled={settings.soundEnabled}
              vibrationEnabled={settings.vibrationEnabled}
              onUpdateTimer={(updated) => {
                setRestTimer(updated || undefined);
                syncSession(exercises, currentExerciseIndex, updated || undefined);
              }}
              onSkip={() => {
                setRestTimer(undefined);
                syncSession(exercises, currentExerciseIndex, undefined);
              }}
            />
          </div>
        )}

        {/* Exercise Switcher Navigation */}
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <button
            onClick={() => handleNavigateExercise(currentExerciseIndex - 1)}
            disabled={currentExerciseIndex === 0}
            className="flex items-center gap-1 rounded-xl p-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <div className="text-center">
            <span className="text-xs font-semibold text-lime-400 uppercase tracking-wider">
              Exercício {currentExerciseIndex + 1} de {exercises.length}
            </span>
            <div className="text-xs text-zinc-400">
              {MUSCLE_GROUP_LABELS[currentExercise.targetMuscleGroup]}
            </div>
          </div>

          <button
            onClick={() => handleNavigateExercise(currentExerciseIndex + 1)}
            disabled={currentExerciseIndex === exercises.length - 1}
            className="flex items-center gap-1 rounded-xl p-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Active Exercise Detail Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                {currentExercise.exerciseName}
              </h2>
              {currentExercise.notes && (
                <p className="mt-1 text-xs text-zinc-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  {currentExercise.notes}
                </p>
              )}
            </div>

            {/* Quick Rest Timer Trigger */}
            {(!restTimer || !restTimer.active) && (
              <button
                onClick={() => {
                  const duration = settings.defaultRestSeconds || 90;
                  const newTimer: ActiveRestTimer = {
                    active: true,
                    durationSeconds: duration,
                    startedAt: Date.now(),
                    targetTimestamp: Date.now() + duration * 1000,
                    isPaused: false,
                    exerciseName: currentExercise.exerciseName,
                    setIndex: 0,
                  };
                  setRestTimer(newTimer);
                  syncSession(exercises, currentExerciseIndex, newTimer);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
              >
                <Clock className="w-3.5 h-3.5 text-lime-400" />
                <span>Descanso</span>
              </button>
            )}
          </div>

          {/* Previous Performance Banner */}
          {previousExercisePerformance && (
            <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-xs text-zinc-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-lime-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Última sessão: </span>
                {previousExercisePerformance
                  .map((s) => `${s.weightKg} kg × ${s.reps}`)
                  .join(' | ')}
              </div>
            </div>
          )}

          {/* Sets Table */}
          <div className="mt-5 space-y-2.5">
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-zinc-400 px-2 uppercase tracking-wider">
              <div className="col-span-2 text-center">SÉRIE</div>
              <div className="col-span-3 text-center">ANTERIOR</div>
              <div className="col-span-3 text-center">CARGA (KG)</div>
              <div className="col-span-2 text-center">REPS</div>
              <div className="col-span-2 text-center">FEITO</div>
            </div>

            {currentExercise.sets.map((set, setIndex) => {
              const previousSet = previousExercisePerformance
                ? previousExercisePerformance[setIndex]
                : null;
              const currentWeight =
                set.actualWeightKg !== undefined ? set.actualWeightKg : set.targetWeightKg;
              const currentReps =
                set.actualReps !== undefined ? set.actualReps : set.targetReps;

              return (
                <div
                  key={set.id}
                  className={`grid grid-cols-12 gap-2 items-center rounded-xl p-2.5 border transition-all ${
                    set.completed
                      ? 'border-lime-500/40 bg-lime-500/10'
                      : 'border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700'
                  }`}
                >
                  {/* Set Number */}
                  <div className="col-span-2 text-center font-bold text-sm text-zinc-300">
                    #{set.setNumber}
                  </div>

                  {/* Previous Performance */}
                  <div className="col-span-3 text-center text-xs text-zinc-400 font-mono">
                    {previousSet ? `${previousSet.weightKg}kg × ${previousSet.reps}` : '—'}
                  </div>

                  {/* Weight Input */}
                  <div className="col-span-3 flex items-center justify-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={currentWeight}
                      onChange={(e) =>
                        handleUpdateSetValue(
                          setIndex,
                          'actualWeightKg',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full text-center rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-sm font-bold text-white focus:border-lime-400 focus:outline-hidden"
                    />
                  </div>

                  {/* Reps Input */}
                  <div className="col-span-2 flex items-center justify-center">
                    <input
                      type="number"
                      min="1"
                      value={currentReps}
                      onChange={(e) =>
                        handleUpdateSetValue(
                          setIndex,
                          'actualReps',
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="w-full text-center rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-sm font-bold text-white focus:border-lime-400 focus:outline-hidden"
                    />
                  </div>

                  {/* Complete Button */}
                  <div className="col-span-2 flex items-center justify-center">
                    <button
                      onClick={() => handleToggleSet(setIndex)}
                      className={`h-10 w-10 rounded-xl flex items-center justify-center transition active:scale-90 ${
                        set.completed
                          ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-950/40'
                          : 'border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-lime-400 hover:text-white'
                      }`}
                      title={set.completed ? 'Marcar como não concluída' : 'Concluir série'}
                    >
                      <Check className={`w-5 h-5 ${set.completed ? 'stroke-[3]' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add / Remove Set Row */}
          <div className="mt-4 flex items-center justify-between pt-2 border-t border-zinc-800/80">
            <button
              onClick={handleAddSet}
              className="flex items-center gap-1.5 text-xs font-semibold text-lime-400 hover:text-lime-300 py-1 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Série</span>
            </button>

            {currentExercise.sets.length > 1 && (
              <button
                onClick={() => handleRemoveSet(currentExercise.sets.length - 1)}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-red-400 py-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Última</span>
              </button>
            )}
          </div>
        </div>

        {/* Exercises Overview List */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
            Relação dos Exercícios
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {exercises.map((ex, index) => {
              const isCurrent = index === currentExerciseIndex;
              const isFinished = ex.sets.every((s) => s.completed);
              const doneCount = ex.sets.filter((s) => s.completed).length;

              return (
                <button
                  key={ex.id}
                  onClick={() => handleNavigateExercise(index)}
                  className={`flex items-center justify-between rounded-xl p-3 text-left transition border ${
                    isCurrent
                      ? 'border-lime-400 bg-lime-400/10 text-white'
                      : isFinished
                      ? 'border-zinc-800 bg-zinc-950/60 text-zinc-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isCurrent
                          ? 'bg-lime-400 text-zinc-950'
                          : isFinished
                          ? 'bg-zinc-800 text-lime-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium truncate">{ex.exerciseName}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs shrink-0 font-mono ml-2">
                    {isFinished ? (
                      <CheckCircle2 className="w-4 h-4 text-lime-400" />
                    ) : (
                      <span>
                        {doneCount}/{ex.sets.length}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workout Notes */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Observações da Sessão (opcional)
          </label>
          <textarea
            value={workoutNotes}
            onChange={(e) => {
              setWorkoutNotes(e.target.value);
              syncSession(exercises, currentExerciseIndex, restTimer);
            }}
            placeholder="Como você se sentiu hoje? Aumentou a carga? Bom pump?"
            rows={2}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white placeholder-zinc-500 focus:border-lime-400 focus:outline-hidden"
          />
        </div>
      </main>

      {/* Confirmation: Discard Workout */}
      <ConfirmationModal
        isOpen={confirmDiscardOpen}
        title="Descartar Treino em Andamento?"
        description="Se você sair agora sem concluir, o treino em andamento será apagado e não contará para seu histórico e estatísticas."
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
        )}. Deseja registrar e salvar no histórico?`}
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
        description="O exercício atual possui séries que ainda não foram marcadas como concluídas. Deseja avançar mesmo assim?"
        confirmLabel="Avançar Assim Mesmo"
        cancelLabel="Ficar e Concluir"
        isDestructive={false}
        onConfirm={confirmAdvanceWithIncomplete}
        onCancel={() => {
          setIncompleteSetsWarningOpen(false);
          setPendingNextIndex(null);
        }}
      />
    </div>
  );
};
