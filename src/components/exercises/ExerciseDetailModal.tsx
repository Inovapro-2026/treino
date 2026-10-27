import React from 'react';
import { X, Dumbbell, Award, History, Heart, CheckCircle2 } from 'lucide-react';
import { Exercise, WorkoutLog } from '../../types';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS, formatVolume } from '../../utils/formatters';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  logs: WorkoutLog[];
  isOpen: boolean;
  onToggleFavorite: (exerciseId: string) => void;
  onClose: () => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  logs,
  isOpen,
  onToggleFavorite,
  onClose,
}) => {
  if (!isOpen) return null;

  // Extract historical sessions for this specific exercise
  const exerciseHistory = React.useMemo(() => {
    const historyEntries: {
      date: string;
      maxWeightKg: number;
      totalVolumeKg: number;
      sets: { setNumber: number; weightKg: number; reps: number }[];
    }[] = [];

    for (const log of logs) {
      const match = log.exercises.find((e) => e.exerciseId === exercise.id);
      if (match && match.completedSets.length > 0) {
        let maxWeight = 0;
        let vol = 0;
        for (const s of match.completedSets) {
          if (s.weightKg > maxWeight) maxWeight = s.weightKg;
          vol += s.weightKg * s.reps;
        }
        historyEntries.push({
          date: log.date,
          maxWeightKg: maxWeight,
          totalVolumeKg: vol,
          sets: match.completedSets,
        });
      }
    }

    return historyEntries;
  }, [logs, exercise.id]);

  // Personal record max weight
  const prWeight = exerciseHistory.reduce(
    (max, item) => (item.maxWeightKg > max ? item.maxWeightKg : max),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl my-8 text-zinc-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-lime-400/20 px-2 py-0.5 text-xs font-bold text-lime-400 uppercase">
                {MUSCLE_GROUP_LABELS[exercise.targetMuscleGroup]}
              </span>
              <span className="text-xs text-zinc-400">
                {EQUIPMENT_LABELS[exercise.equipment]}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              {exercise.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(exercise.id)}
              className={`p-2 rounded-xl transition ${
                exercise.isFavorite
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Favoritar exercício"
            >
              <Heart className={`w-5 h-5 ${exercise.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* PR Stats Card */}
          {prWeight > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 to-zinc-900 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/20 text-lime-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Recorde Pessoal (PR)
                  </span>
                  <div className="text-xl font-extrabold text-white font-mono">
                    {prWeight} kg
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-zinc-400 font-medium">
                {exerciseHistory.length} sessões registradas
              </div>
            </div>
          )}

          {/* Secondary Muscles */}
          {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
            <div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Músculos Secundários / Sinérgicos
              </span>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondaryMuscles.map((m) => (
                  <span
                    key={m}
                    className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
                  >
                    {MUSCLE_GROUP_LABELS[m]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Biomechanical Instructions */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Instruções de Execução Biomecânica
            </h3>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3">
              <p>{exercise.instructions}</p>
              {exercise.tips && (
                <div className="rounded-xl border border-lime-500/20 bg-lime-500/5 p-3 text-xs text-lime-300 font-medium">
                  <strong className="text-lime-400">Dica de Hipertrofia: </strong>
                  {exercise.tips}
                </div>
              )}
            </div>
          </div>

          {/* Performance History Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-lime-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Histórico de Cargas no Exercício
              </h3>
            </div>

            {exerciseHistory.length > 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-3 text-[11px] font-bold text-zinc-400 border-b border-zinc-800 uppercase">
                  <div className="col-span-4">DATA</div>
                  <div className="col-span-4 text-center">CARGA MÁXIMA</div>
                  <div className="col-span-4 text-right">VOLUME SESSÃO</div>
                </div>

                <div className="divide-y divide-zinc-850 max-h-48 overflow-y-auto">
                  {exerciseHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 p-3 text-xs text-zinc-200 items-center hover:bg-zinc-900/50"
                    >
                      <div className="col-span-4 font-mono text-zinc-400">
                        {new Date(item.date).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="col-span-4 text-center font-bold font-mono text-lime-400">
                        {item.maxWeightKg} kg
                      </div>
                      <div className="col-span-4 text-right font-mono text-zinc-300">
                        {formatVolume(item.totalVolumeKg)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
                Nenhum treino concluído com este exercício ainda. Complete uma sessão para visualizar o histórico de cargas.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
