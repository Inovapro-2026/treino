import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Plus, Minus, Bell, Volume2, VolumeX } from 'lucide-react';
import { ActiveRestTimer } from '../../types';
import { playCountdownTone, playCompleteChime, triggerHaptic } from '../../utils/audio';

interface RestTimerProps {
  timer: ActiveRestTimer;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onUpdateTimer: (updated: ActiveRestTimer | null) => void;
  onSkip: () => void;
  onFinish?: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  timer,
  soundEnabled,
  vibrationEnabled,
  onUpdateTimer,
  onSkip,
  onFinish,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (timer.isPaused && timer.remainingSecondsWhenPaused !== undefined) {
      return timer.remainingSecondsWhenPaused;
    }
    const diff = Math.ceil((timer.targetTimestamp - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const [isCompletedState, setIsCompletedState] = useState(false);
  const prevSecondsRef = useRef<number>(secondsLeft);
  const finishedHandledRef = useRef<boolean>(false);

  // Sync and tick based on absolute timestamp
  useEffect(() => {
    if (timer.isPaused) {
      if (timer.remainingSecondsWhenPaused !== undefined) {
        setSecondsLeft(timer.remainingSecondsWhenPaused);
      }
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((timer.targetTimestamp - now) / 1000);

      if (remaining <= 0) {
        setSecondsLeft(0);
        if (!finishedHandledRef.current) {
          finishedHandledRef.current = true;
          setIsCompletedState(true);
          if (soundEnabled) playCompleteChime();
          if (vibrationEnabled) triggerHaptic([150, 80, 150]);
          if (onFinish) onFinish();
        }
        clearInterval(interval);
      } else {
        setSecondsLeft(remaining);

        // Sound cue on last 3, 2, 1 seconds
        if (remaining <= 3 && remaining > 0 && remaining !== prevSecondsRef.current) {
          if (soundEnabled) playCountdownTone(700, 0.08);
          if (vibrationEnabled) triggerHaptic(40);
        }
      }
      prevSecondsRef.current = remaining;
    }, 200);

    return () => clearInterval(interval);
  }, [timer.targetTimestamp, timer.isPaused, timer.remainingSecondsWhenPaused, soundEnabled, vibrationEnabled, onFinish]);

  // Handle Play/Pause
  const togglePause = () => {
    if (timer.isPaused) {
      // Resume
      const remainingSec = timer.remainingSecondsWhenPaused || secondsLeft;
      const newTarget = Date.now() + remainingSec * 1000;
      onUpdateTimer({
        ...timer,
        isPaused: false,
        targetTimestamp: newTarget,
        remainingSecondsWhenPaused: undefined,
      });
    } else {
      // Pause
      const remainingSec = Math.max(0, Math.ceil((timer.targetTimestamp - Date.now()) / 1000));
      onUpdateTimer({
        ...timer,
        isPaused: true,
        remainingSecondsWhenPaused: remainingSec,
      });
    }
  };

  // Adjust time (+30s / -15s)
  const adjustSeconds = (delta: number) => {
    const currentRemaining = timer.isPaused
      ? timer.remainingSecondsWhenPaused || secondsLeft
      : Math.max(0, Math.ceil((timer.targetTimestamp - Date.now()) / 1000));

    const newSeconds = Math.max(5, currentRemaining + delta);
    const newTotalDuration = Math.max(newSeconds, timer.durationSeconds + (delta > 0 ? delta : 0));

    if (timer.isPaused) {
      setSecondsLeft(newSeconds);
      onUpdateTimer({
        ...timer,
        durationSeconds: newTotalDuration,
        remainingSecondsWhenPaused: newSeconds,
      });
    } else {
      const newTarget = Date.now() + newSeconds * 1000;
      setSecondsLeft(newSeconds);
      onUpdateTimer({
        ...timer,
        durationSeconds: newTotalDuration,
        targetTimestamp: newTarget,
      });
    }
  };

  // Reset to original duration
  const resetTimer = () => {
    finishedHandledRef.current = false;
    setIsCompletedState(false);
    const newTarget = Date.now() + timer.durationSeconds * 1000;
    setSecondsLeft(timer.durationSeconds);
    onUpdateTimer({
      ...timer,
      isPaused: false,
      targetTimestamp: newTarget,
      remainingSecondsWhenPaused: undefined,
    });
  };

  // SVG Circular progress math
  const size = 180;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = timer.durationSeconds || 90;
  const progressRatio = Math.max(0, Math.min(1, secondsLeft / total));
  const strokeDashoffset = circumference * (1 - progressRatio);

  const isLowTime = secondsLeft <= 5 && secondsLeft > 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-2xl text-center">
      {isCompletedState && (
        <div className="absolute inset-0 bg-lime-500/10 animate-pulse pointer-events-none" />
      )}
      {isLowTime && (
        <div className="absolute inset-0 bg-amber-500/5 animate-pulse pointer-events-none" />
      )}

      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
        <span className="font-semibold text-lime-400 uppercase tracking-wider">
          Intervalo de Descanso
        </span>
        <div className="flex items-center gap-1.5">
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-zinc-600" />
          )}
          <span>{timer.exerciseName ? `Após Série ${timer.setIndex + 1}` : 'Descanso'}</span>
        </div>
      </div>

      <div className="relative my-4 flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#27272a"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={isCompletedState ? '#84cc16' : isLowTime ? '#f59e0b' : '#a3e635'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-linear"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isCompletedState ? (
            <div className="animate-bounce">
              <span className="text-3xl font-extrabold text-lime-400">PRONTO!</span>
              <p className="text-xs font-semibold text-zinc-300 mt-1">Hora de treinar</p>
            </div>
          ) : (
            <>
              <span
                className={`font-mono text-4xl font-extrabold tracking-tight transition-colors ${
                  isLowTime ? 'text-amber-400 animate-pulse' : 'text-white'
                }`}
              >
                {formattedTime}
              </span>
              <span className="text-xs text-zinc-400 mt-0.5 font-medium">
                {timer.isPaused ? 'Pausado' : 'descanso'}
              </span>
            </>
          )}
        </div>
      </div>

      {isCompletedState ? (
        <div className="mb-4 rounded-xl border border-lime-500/30 bg-lime-500/10 py-2.5 px-4 text-xs font-bold text-lime-400 flex items-center justify-center gap-2">
          <Bell className="w-4 h-4 animate-bounce" />
          <span>Descanso concluído! Volte para a próxima série.</span>
        </div>
      ) : isLowTime ? (
        <div className="mb-4 text-xs font-semibold text-amber-400 animate-pulse">
          Prepare-se! Faltam poucos segundos.
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => adjustSeconds(-15)}
          className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          title="Diminuir 15 segundos"
        >
          <Minus className="w-3 h-3" />
          <span>15s</span>
        </button>
        <button
          onClick={() => adjustSeconds(30)}
          className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          title="Adicionar 30 segundos"
        >
          <Plus className="w-3 h-3" />
          <span>30s</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={resetTimer}
          className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-800/50 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 active:scale-95"
          title="Reiniciar descanso"
        >
          <RotateCcw className="w-4 h-4 mb-0.5" />
          <span>Reiniciar</span>
        </button>

        <button
          onClick={togglePause}
          className={`flex flex-col items-center justify-center rounded-xl py-2 text-xs font-bold transition active:scale-95 ${
            timer.isPaused
              ? 'bg-lime-400 text-zinc-950 hover:bg-lime-300'
              : 'border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
          }`}
        >
          {timer.isPaused ? (
            <>
              <Play className="w-4 h-4 mb-0.5 fill-current" />
              <span>Retomar</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 mb-0.5" />
              <span>Pausar</span>
            </>
          )}
        </button>

        <button
          onClick={onSkip}
          className="flex flex-col items-center justify-center rounded-xl bg-lime-400/10 border border-lime-400/30 py-2 text-xs font-bold text-lime-400 transition hover:bg-lime-400/20 active:scale-95"
          title="Pular descanso e prosseguir"
        >
          <FastForward className="w-4 h-4 mb-0.5" />
          <span>Pular</span>
        </button>
      </div>
    </div>
  );
};
