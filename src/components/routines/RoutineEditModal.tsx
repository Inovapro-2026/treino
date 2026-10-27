import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Dumbbell,
  Clock,
  Layers,
  Check,
} from 'lucide-react';
import { WorkoutRoutine, WorkoutExercise, WorkoutSet, Exercise } from '../../types';
import { DAY_NAMES, MUSCLE_GROUP_LABELS } from '../../utils/formatters';

interface RoutineEditModalProps {
  routine: WorkoutRoutine;
  allExercises: Exercise[];
  isOpen: boolean;
  onSave: (updated: WorkoutRoutine) => void;
  onClose: () => void;
}

export const RoutineEditModal: React.FC<RoutineEditModalProps> = ({
  routine,
  allExercises,
  isOpen,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(routine.name);
  const [description, setDescription] = useState(routine.description);
  const [dayOfWeek, setDayOfWeek] = useState(routine.dayOfWeek);
  const [isRestDay, setIsRestDay] = useState(routine.isRestDay);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(routine.exercises);

  // Exercise Picker sub-modal state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  if (!isOpen) return null;

  // Add an exercise from library
  const handleAddExerciseFromPicker = (exercise: Exercise) => {
    const newEx: WorkoutExercise = {
      id: `w_ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      targetMuscleGroup: exercise.targetMuscleGroup,
      sets: [
        { id: `s_${Date.now()}_1`, setNumber: 1, targetReps: 10, targetWeightKg: 20, restSeconds: 90, completed: false },
        { id: `s_${Date.now()}_2`, setNumber: 2, targetReps: 10, targetWeightKg: 20, restSeconds: 90, completed: false },
        { id: `s_${Date.now()}_3`, setNumber: 3, targetReps: 8, targetWeightKg: 25, restSeconds: 90, completed: false },
      ],
    };
    setExercises([...exercises, newEx]);
    setIsPickerOpen(false);
  };

  // Reorder exercises
  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= exercises.length) return;
    const clone = [...exercises];
    const temp = clone[index];
    clone[index] = clone[targetIdx];
    clone[targetIdx] = temp;
    setExercises(clone);
  };

  // Remove exercise
  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, idx) => idx !== index));
  };

  // Modify sets within an exercise
  const addSetToExercise = (exIndex: number) => {
    const target = exercises[exIndex];
    const lastSet = target.sets[target.sets.length - 1];
    const newSet: WorkoutSet = {
      id: `s_${Date.now()}`,
      setNumber: target.sets.length + 1,
      targetReps: lastSet ? lastSet.targetReps : 10,
      targetWeightKg: lastSet ? lastSet.targetWeightKg : 20,
      restSeconds: lastSet ? lastSet.restSeconds : 90,
      completed: false,
    };

    const updated = exercises.map((ex, idx) =>
      idx === exIndex ? { ...ex, sets: [...ex.sets, newSet] } : ex
    );
    setExercises(updated);
  };

  const removeSetFromExercise = (exIndex: number, setIdx: number) => {
    const target = exercises[exIndex];
    if (target.sets.length <= 1) return;
    const updatedSets = target.sets
      .filter((_, idx) => idx !== setIdx)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    const updated = exercises.map((ex, idx) =>
      idx === exIndex ? { ...ex, sets: updatedSets } : ex
    );
    setExercises(updated);
  };

  const updateSetField = (
    exIndex: number,
    setIdx: number,
    field: 'targetReps' | 'targetWeightKg' | 'restSeconds',
    val: number
  ) => {
    const updated = exercises.map((ex, idx) => {
      if (idx !== exIndex) return ex;
      const updatedSets = ex.sets.map((s, sIdx) => {
        if (sIdx !== setIdx) return s;
        return { ...s, [field]: val };
      });
      return { ...ex, sets: updatedSets };
    });
    setExercises(updated);
  };

  const updateExerciseNotes = (exIndex: number, notes: string) => {
    const updated = exercises.map((ex, idx) => (idx === exIndex ? { ...ex, notes } : ex));
    setExercises(updated);
  };

  const handleSave = () => {
    // Derive muscle groups
    const muscleGroups = Array.from(new Set(exercises.map((e) => e.targetMuscleGroup)));
    const updatedRoutine: WorkoutRoutine = {
      ...routine,
      name,
      description,
      dayOfWeek,
      isRestDay,
      exercises: isRestDay ? [] : exercises,
      targetMuscleGroups: isRestDay ? [] : muscleGroups,
    };
    onSave(updatedRoutine);
    onClose();
  };

  const filteredPickerExercises = allExercises.filter(
    (e) =>
      e.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      MUSCLE_GROUP_LABELS[e.targetMuscleGroup].toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl my-8 text-zinc-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white">Editar Ficha de Treino</h2>
            <p className="text-xs text-zinc-400">Configure exercícios, séries, cargas e descanso.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Routine Name & Day */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Nome do Treino
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-lime-400 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Dia da Semana
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-lime-400 focus:outline-hidden"
              >
                {DAY_NAMES.map((d, idx) => (
                  <option key={idx} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Objetivo / Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Foco em peitoral superior, deltoide lateral e tríceps..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-200 focus:border-lime-400 focus:outline-hidden"
            />
          </div>

          {/* Rest Day Toggle */}
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <input
              type="checkbox"
              id="isRestDay"
              checked={isRestDay}
              onChange={(e) => setIsRestDay(e.target.checked)}
              className="h-4 w-4 rounded accent-lime-400"
            />
            <label htmlFor="isRestDay" className="text-sm font-medium text-zinc-300">
              Marcar como <strong className="text-white">Dia de Descanso / Recuperação</strong> (sem exercícios)
            </label>
          </div>

          {/* Exercises List */}
          {!isRestDay && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Exercícios ({exercises.length})
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-lime-400 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Adicionar Exercício</span>
                </button>
              </div>

              {exercises.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
                  Nenhum exercício cadastrado nesta ficha. Toque no botão acima para adicionar.
                </div>
              ) : (
                <div className="space-y-4">
                  {exercises.map((ex, exIdx) => (
                    <div
                      key={ex.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3"
                    >
                      {/* Exercise Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-lime-400">
                            {exIdx + 1}
                          </span>
                          <span className="font-bold text-sm text-white">{ex.exerciseName}</span>
                          <span className="text-[11px] text-zinc-500">
                            ({MUSCLE_GROUP_LABELS[ex.targetMuscleGroup]})
                          </span>
                        </div>

                        {/* Order & Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveExercise(exIdx, 'up')}
                            disabled={exIdx === 0}
                            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"
                            title="Mover para cima"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveExercise(exIdx, 'down')}
                            disabled={exIdx === exercises.length - 1}
                            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"
                            title="Mover para baixo"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeExercise(exIdx)}
                            className="p-1 text-zinc-500 hover:text-red-400 ml-1"
                            title="Remover exercício"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sets config row */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-zinc-500 px-2 uppercase">
                          <div className="col-span-2">SÉRIE</div>
                          <div className="col-span-3 text-center">CARGA (KG)</div>
                          <div className="col-span-3 text-center">REPS</div>
                          <div className="col-span-3 text-center">DESCANSO (S)</div>
                          <div className="col-span-1"></div>
                        </div>

                        {ex.sets.map((set, setIdx) => (
                          <div
                            key={set.id}
                            className="grid grid-cols-12 gap-2 items-center rounded-lg bg-zinc-900/80 p-1.5 text-xs border border-zinc-850"
                          >
                            <div className="col-span-2 font-mono font-bold text-zinc-400 text-center">
                              #{set.setNumber}
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={set.targetWeightKg}
                                onChange={(e) =>
                                  updateSetField(
                                    exIdx,
                                    setIdx,
                                    'targetWeightKg',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full text-center rounded-md border border-zinc-700 bg-zinc-950 py-1 text-xs font-semibold text-white focus:border-lime-400 focus:outline-hidden"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                min="1"
                                value={set.targetReps}
                                onChange={(e) =>
                                  updateSetField(
                                    exIdx,
                                    setIdx,
                                    'targetReps',
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                                className="w-full text-center rounded-md border border-zinc-700 bg-zinc-950 py-1 text-xs font-semibold text-white focus:border-lime-400 focus:outline-hidden"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                min="10"
                                step="10"
                                value={set.restSeconds}
                                onChange={(e) =>
                                  updateSetField(
                                    exIdx,
                                    setIdx,
                                    'restSeconds',
                                    parseInt(e.target.value, 10) || 60
                                  )
                                }
                                className="w-full text-center rounded-md border border-zinc-700 bg-zinc-950 py-1 text-xs font-semibold text-white focus:border-lime-400 focus:outline-hidden"
                              />
                            </div>
                            <div className="col-span-1 text-right">
                              {ex.sets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSetFromExercise(exIdx, setIdx)}
                                  className="text-zinc-500 hover:text-red-400"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Set + Exercise Notes */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => addSetToExercise(exIdx)}
                          className="text-[11px] font-bold text-lime-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar Série</span>
                        </button>

                        <input
                          type="text"
                          value={ex.notes || ''}
                          onChange={(e) => updateExerciseNotes(exIdx, e.target.value)}
                          placeholder="Observação da série (ex: cadência 3s, drop-set...)"
                          className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-300 w-1/2 focus:border-lime-400 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-lime-400 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition shadow-sm shadow-lime-950/30"
          >
            Salvar Alterações
          </button>
        </div>
      </div>

      {/* Exercise Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base">Selecionar Exercício</h3>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Buscar por nome ou grupo muscular..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-lime-400 focus:outline-hidden"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredPickerExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleAddExerciseFromPicker(exercise)}
                  className="w-full flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-left hover:border-lime-400/50 hover:bg-zinc-900 transition group"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-lime-400 transition-colors">
                      {exercise.name}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {MUSCLE_GROUP_LABELS[exercise.targetMuscleGroup]} • {exercise.equipment}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-zinc-500 group-hover:text-lime-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
