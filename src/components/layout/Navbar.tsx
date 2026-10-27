import React from 'react';
import { Dumbbell, Play, Flame } from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { UserSettings, ActiveWorkoutSession } from '../../types';

interface NavbarProps {
  settings: UserSettings;
  activeSession: ActiveWorkoutSession | null;
  onResumeWorkout: () => void;
  streakDays: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  activeSession,
  onResumeWorkout,
  streakDays,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-lime-500 text-zinc-950 font-black shadow-md shadow-lime-950/20">
            <Dumbbell className="h-5 w-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">
                HYPER<span className="text-lime-400">PULSE</span>
              </span>
              <span className="text-xs font-mono font-semibold text-zinc-500 uppercase">Pro</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Streak Indicator */}
          {streakDays > 0 && (
            <div
              className="flex items-center gap-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400"
              title={`${streakDays} semanas consecutivas cumprindo a meta de treinos`}
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{streakDays} {streakDays === 1 ? 'sem' : 'sems'}</span>
            </div>
          )}

          {/* Active Workout Resume pill if workout is minimized in background */}
          {activeSession && (
            <button
              onClick={onResumeWorkout}
              className="animate-pulse flex items-center gap-1.5 rounded-xl bg-lime-400 px-3 py-1.5 text-xs font-bold text-zinc-950 transition hover:bg-lime-300 shadow-md shadow-lime-950/40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Em Andamento</span>
            </button>
          )}

          {/* PWA Install Button */}
          <PWAInstallButton compact={true} />
        </div>
      </div>
    </header>
  );
};
