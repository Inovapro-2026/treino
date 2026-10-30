import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Play,
  Edit3,
  Copy,
  Trash2,
  Clock,
  Dumbbell,
  CheckCircle,
  FileSpreadsheet,
  Info,
  TrendingUp,
  Sparkles,
  HelpCircle,
  X,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { WorkoutRoutine, Exercise } from '../../types';
import { RoutineEditModal } from './RoutineEditModal';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { DAY_NAMES, MUSCLE_GROUP_LABELS } from '../../utils/formatters';
import { PROGRESSION_GUIDELINES } from '../../db/defaultData';
import { isLegacyRoutine } from '../../db/storage';

interface RoutinesViewProps {
  routines: WorkoutRoutine[];
  allExercises: Exercise[];
  onStartWorkout: (routine: WorkoutRoutine) => void;
  onSaveRoutine: (routine: WorkoutRoutine) => void;
  onDeleteRoutine: (id: string) => void;
  onDuplicateRoutine: (routine: WorkoutRoutine) => void;
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  routines,
  allExercises,
  onStartWorkout,
  onSaveRoutine,
  onDeleteRoutine,
  onDuplicateRoutine,
}) => {
  const [selectedRoutineForEdit, setSelectedRoutineForEdit] = useState<WorkoutRoutine | null>(null);
  const [routineToDelete, setRoutineToDelete] = useState<string | null>(null);
  const [showProgressionModal, setShowProgressionModal] = useState(false);

  // Sort routines from Monday (1) to Sunday (0) for natural athletic weekly flow, filtering out legacy duplicates
  const sortedRoutines = [...routines]
    .filter((r) => !isLegacyRoutine(r))
    .sort((a, b) => {
      const orderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
      const orderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
      return orderA - orderB;
    });

  const handleCreateNewRoutine = () => {
    const newRoutine: WorkoutRoutine = {
      id: `custom_routine_${Date.now()}`,
      name: 'Novo Treino Personalizado',
      description: 'Treino personalizado de hipertrofia',
      dayOfWeek: 1,
      isRestDay: false,
      color: '#84cc16',
      targetMuscleGroups: ['peito', 'triceps'],
      exercises: [],
      estimatedMinutes: '60 a 75 min',
    };
    setSelectedRoutineForEdit(newRoutine);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-semibold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ficha Oficial: Treino de Hipertrofia — Smart Fit</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Divisão Semanal de Treinos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Ganho de massa muscular com progressão gradual de carga, boa execução e recuperação adequada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProgressionModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-850 px-3.5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition"
          >
            <TrendingUp className="w-4 h-4 text-lime-400" />
            <span>Como Progredir</span>
          </button>

          <button
            onClick={handleCreateNewRoutine}
            className="flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition active:scale-95 shadow-sm shadow-lime-950/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Criar Treino</span>
          </button>
        </div>
      </div>

      {/* Prescription Notice Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-300">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400/20 text-lime-400 font-bold">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-bold text-white text-sm">
                Divisão Semanal Prescrita (Hipertrofia):
              </h4>
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                Duração média: 60 a 75 min/treino
              </span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              <strong>Segunda:</strong> Peito, Ombros e Tríceps (20 séries) • <strong>Terça:</strong> Pernas foco Quadríceps (20 séries) • <strong>Quarta:</strong> Costas e Bíceps (19 séries) • <strong>Quinta:</strong> Superior Completo (18 séries) • <strong>Sexta:</strong> Descanso • <strong>Sábado:</strong> Descanso • <strong>Domingo:</strong> Posterior e Glúteos (19 séries).
            </p>
            <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 text-lime-400">
                <CheckCircle className="w-3.5 h-3.5" />
                Descansos: 150s compostos / 75s isoladores
              </span>
              <span>•</span>
              <span className="text-zinc-400">RIR 1-3 (1 a 3 repetições na reserva)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Routines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedRoutines.map((routine) => {
          const totalSets = routine.totalPlannedSets ?? routine.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
          const estimatedDuration = routine.estimatedMinutes || '60 a 75 min';

          return (
            <div
              key={routine.id}
              className={`flex flex-col justify-between rounded-2xl border transition-all ${
                routine.isRestDay
                  ? 'border-zinc-850 bg-zinc-950/50 opacity-80'
                  : 'border-zinc-800 bg-zinc-900/90 hover:border-zinc-700 shadow-xl'
              }`}
            >
              <div className="p-5">
                {/* Day Badge & Info */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-bold text-lime-400">
                      {DAY_NAMES[routine.dayOfWeek]}
                    </span>
                    {routine.planName && (
                      <span className="text-[10px] text-zinc-400 hidden sm:inline-block">
                        {routine.planName}
                      </span>
                    )}
                  </div>

                  {routine.isRestDay ? (
                    <span className="text-xs font-semibold text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded-full">
                      Dia de Descanso
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-lime-400 bg-lime-400/10 border border-lime-400/20 px-2 py-0.5 rounded-full">
                        {totalSets} séries
                      </span>
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {estimatedDuration}
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white">{routine.name}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {routine.description}
                </p>

                {/* Exercises Preview (if not rest day) */}
                {!routine.isRestDay && routine.exercises.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-zinc-850 pt-3">
                    {routine.exercises.map((ex, idx) => (
                      <div
                        key={ex.id || `${routine.id}_ex_${idx}`}
                        className="flex items-center justify-between text-xs text-zinc-300 py-0.5 border-b border-zinc-850/50 last:border-none"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="text-zinc-400 font-mono text-[11px] w-4 shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="truncate font-medium text-zinc-200">
                            {ex.exerciseName}
                          </span>
                          {ex.isUnilateral && (
                            <span className="text-[9px] bg-purple-900/40 text-purple-300 border border-purple-700/50 px-1.5 py-0.2 rounded shrink-0">
                              Unilateral
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-right">
                          <span className="text-zinc-300 font-mono font-semibold text-[11px]">
                            {ex.sets.length}×{ex.repsRange || (ex.sets[0]?.repsRange) || '8-12'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                            {ex.sets[0]?.restSeconds || 75}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {routine.isRestDay && (
                  <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 text-xs text-zinc-400">
                    <p>
                      Recuperação ativa ou repouso total. Dias de descanso são essenciais para a supercompensação muscular e não contam como falha de treino.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between border-t border-zinc-850 bg-zinc-950/40 p-3 rounded-b-2xl">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedRoutineForEdit(routine)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                    title="Editar ficha"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-lime-400" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => onDuplicateRoutine(routine)}
                    className="p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition"
                    title="Duplicar treino"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {routines.length > 1 && (
                    <button
                      onClick={() => setRoutineToDelete(routine.id)}
                      className="p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 rounded-lg transition"
                      title="Excluir treino"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {!routine.isRestDay && (
                  <button
                    onClick={() => onStartWorkout(routine)}
                    className="flex items-center gap-1.5 rounded-xl bg-lime-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition active:scale-95 shadow-sm shadow-lime-950/30"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Iniciar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Routine Edit Modal */}
      {selectedRoutineForEdit && (
        <RoutineEditModal
          routine={selectedRoutineForEdit}
          allExercises={allExercises}
          isOpen={true}
          onSave={onSaveRoutine}
          onClose={() => setSelectedRoutineForEdit(null)}
        />
      )}

      {/* Confirm Routine Deletion Modal */}
      <ConfirmationModal
        isOpen={routineToDelete !== null}
        title="Excluir Ficha de Treino?"
        description="Tem certeza de que deseja remover esta ficha? Essa ação não apagará seus registros já concluídos no histórico."
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={() => {
          if (routineToDelete) onDeleteRoutine(routineToDelete);
          setRoutineToDelete(null);
        }}
        onCancel={() => setRoutineToDelete(null)}
      />

      {/* Modal Diretrizes de Como Progredir */}
      {showProgressionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-lime-400">
                <TrendingUp className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">
                  {PROGRESSION_GUIDELINES.title}
                </h3>
              </div>
              <button
                onClick={() => setShowProgressionModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-zinc-300 max-h-[60vh] overflow-y-auto pr-1">
              {PROGRESSION_GUIDELINES.rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-1"
                >
                  <div className="flex items-center gap-2 font-bold text-lime-400 text-sm">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-lime-400" />
                    <span>{rule.title}</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed pl-6">
                    {rule.description}
                  </p>
                </div>
              ))}

              <div className="rounded-xl border border-lime-400/20 bg-lime-400/5 p-3.5 text-zinc-300 text-xs">
                <p className="font-semibold text-lime-400 mb-1">
                  💡 Intervalos de Descanso Programados:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                  <li>
                    <strong>150 segundos (2 min e 30 seg):</strong> Exercícios multiarticulares pesados (Agachamento, Supinos, Leg Press, Remadas, Stiff).
                  </li>
                  <li>
                    <strong>75 segundos (1 min e 15 seg):</strong> Exercícios isoladores e cabos (Elevação lateral, Crucifixo, Roscas, Tríceps, Panturrilhas, Abdominal).
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowProgressionModal(false)}
                className="w-full py-2.5 rounded-xl bg-lime-400 font-bold text-zinc-950 hover:bg-lime-300 transition text-xs"
              >
                Entendido, Fechar Diretrizes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
