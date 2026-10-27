import React, { useState } from 'react';
import { X, Plus, Dumbbell } from 'lucide-react';
import { Exercise, MuscleGroup, Equipment } from '../../types';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '../../utils/formatters';

interface CreateExerciseModalProps {
  isOpen: boolean;
  onSave: (exercise: Exercise) => void;
  onClose: () => void;
}

export const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({
  isOpen,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [targetMuscleGroup, setTargetMuscleGroup] = useState<MuscleGroup>('peito');
  const [equipment, setEquipment] = useState<Equipment>('halteres');
  const [instructions, setInstructions] = useState('');
  const [tips, setTips] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newExercise: Exercise = {
      id: `custom_ex_${Date.now()}`,
      name: name.trim(),
      targetMuscleGroup,
      equipment,
      instructions: instructions.trim() || 'Exercício personalizado cadastrado pelo atleta.',
      tips: tips.trim() || undefined,
      isCustom: true,
      isFavorite: true,
    };

    onSave(newExercise);
    onClose();
  };

  const muscleOptions: MuscleGroup[] = [
    'peito',
    'costas',
    'ombros',
    'biceps',
    'triceps',
    'quadriceps',
    'posteriores',
    'gluteos',
    'panturrilhas',
    'abdomen',
  ];

  const equipmentOptions: Equipment[] = [
    'barra',
    'halteres',
    'maquina',
    'cabo',
    'peso_corporal',
    'elastico',
    'outro',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl text-zinc-100">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/20 text-lime-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Novo Exercício Personalizado</h2>
              <p className="text-xs text-zinc-400">Cadastre um exercício da sua ficha</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Nome do Exercício *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Supino Inclinado na Máquina Smith"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:outline-hidden"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Grupo Muscular Principal
              </label>
              <select
                value={targetMuscleGroup}
                onChange={(e) => setTargetMuscleGroup(e.target.value as MuscleGroup)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-white focus:border-lime-400 focus:outline-hidden"
              >
                {muscleOptions.map((m) => (
                  <option key={m} value={m}>
                    {MUSCLE_GROUP_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Equipamento Utilizado
              </label>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value as Equipment)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-white focus:border-lime-400 focus:outline-hidden"
              >
                {equipmentOptions.map((eq) => (
                  <option key={eq} value={eq}>
                    {EQUIPMENT_LABELS[eq]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Instruções de Execução (opcional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="Descreva a postura, trajetória e padrão motor..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200 focus:border-lime-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Dicas ou Observações Pessoais (opcional)
            </label>
            <input
              type="text"
              value={tips}
              onChange={(e) => setTips(e.target.value)}
              placeholder="Ex: Regulagem do banco no pino 4, pegada na marca do anel..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-200 focus:border-lime-400 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-lime-400 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition"
            >
              Salvar Exercício
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
