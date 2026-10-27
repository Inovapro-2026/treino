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
} from 'lucide-react';
import { WorkoutRoutine, Exercise } from '../../types';
import { RoutineEditModal } from './RoutineEditModal';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { DAY_NAMES, MUSCLE_GROUP_LABELS } from '../../utils/formatters';

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

  // Sort routines from Monday (1) to Sunday (0) for natural athletic weekly flow
  const sortedRoutines = [...routines].sort((a, b) => {
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
    };
    setSelectedRoutineForEdit(newRoutine);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Divisão Semanal de Treinos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Estrutura de hipertrofia semanal programada com dias de treino e descanso.
          </p>
        </div>

        <button
          onClick={handleCreateNewRoutine}
          className="flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition active:scale-95 shadow-sm shadow-lime-950/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Criar Treino</span>
        </button>
      </div>

      {/* Prescription Notice Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-300">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-400/20 text-lime-400 font-bold">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-white text-sm">
              Divisão Semanal Prescrita (Hipertrofia):
            </h4>
            <p className="text-zinc-400 leading-relaxed">
              Segunda (Peito, Ombros, Tríceps) • Terça (Pernas foco Quadríceps) • Quarta (Costas e Bíceps) • Quinta (Membros Superiores) • Sexta (Descanso) • Sábado (Descanso) • Domingo (Posteriores e Glúteos).
            </p>
            <p className="text-zinc-500 pt-0.5">
              Você pode tocar em <strong>"Editar"</strong> em qualquer dia para ajustar séries, cargas, repetições ou adicionar novos exercícios da sua ficha física.
            </p>
          </div>
        </div>
      </div>

      {/* Routines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedRoutines.map((routine) => {
          const totalSets = routine.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

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
                {/* Day Badge & Muscle tags */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-bold text-lime-400">
                    {DAY_NAMES[routine.dayOfWeek]}
                  </span>

                  {routine.isRestDay ? (
                    <span className="text-xs font-semibold text-zinc-400">Descanso</span>
                  ) : (
                    <span className="text-xs text-zinc-400">
                      {routine.exercises.length} exercícios • {totalSets} séries
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white">{routine.name}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {routine.description}
                </p>

                {/* Exercises Preview (if not rest day) */}
                {!routine.isRestDay && routine.exercises.length > 0 && (
                  <div className="mt-4 space-y-1.5 border-t border-zinc-850 pt-3">
                    {routine.exercises.slice(0, 4).map((ex, idx) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between text-xs text-zinc-300"
                      >
                        <span className="truncate max-w-[200px] sm:max-w-xs">
                          {idx + 1}. {ex.exerciseName}
                        </span>
                        <span className="text-zinc-400 font-mono shrink-0 ml-2">
                          {ex.sets.length} séries
                        </span>
                      </div>
                    ))}
                    {routine.exercises.length > 4 && (
                      <div className="text-[11px] text-zinc-400 pt-1">
                        + mais {routine.exercises.length - 4} exercícios...
                      </div>
                    )}
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
    </div>
  );
};
