import React, { useState } from 'react';
import {
  Search,
  Plus,
  Heart,
  Dumbbell,
  Filter,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Exercise, MuscleGroup, Equipment, WorkoutLog } from '../../types';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '../../utils/formatters';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { CreateExerciseModal } from './CreateExerciseModal';

interface ExerciseLibraryProps {
  exercises: Exercise[];
  logs: WorkoutLog[];
  onSaveExercise: (exercise: Exercise) => void;
  onToggleFavorite: (exerciseId: string) => void;
}

export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  exercises,
  logs,
  onSaveExercise,
  onToggleFavorite,
}) => {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Modals
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<Exercise | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filter logic
  const filteredExercises = exercises.filter((ex) => {
    if (favoritesOnly && !ex.isFavorite) return false;
    if (selectedMuscle !== 'all' && ex.targetMuscleGroup !== selectedMuscle) return false;
    if (selectedEquipment !== 'all' && ex.equipment !== selectedEquipment) return false;
    if (search.trim()) {
      const query = search.toLowerCase();
      const matchName = ex.name.toLowerCase().includes(query);
      const matchMuscle = MUSCLE_GROUP_LABELS[ex.targetMuscleGroup].toLowerCase().includes(query);
      const matchEquip = EQUIPMENT_LABELS[ex.equipment].toLowerCase().includes(query);
      if (!matchName && !matchMuscle && !matchEquip) return false;
    }
    return true;
  });

  const muscleFilters: { id: MuscleGroup | 'all'; label: string }[] = [
    { id: 'all', label: 'Todos os Músculos' },
    { id: 'peito', label: 'Peito' },
    { id: 'costas', label: 'Costas' },
    { id: 'ombros', label: 'Ombros' },
    { id: 'biceps', label: 'Bíceps' },
    { id: 'triceps', label: 'Tríceps' },
    { id: 'quadriceps', label: 'Quadríceps' },
    { id: 'posteriores', label: 'Posteriores' },
    { id: 'gluteos', label: 'Glúteos' },
    { id: 'panturrilhas', label: 'Panturrilhas' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Biblioteca de Exercícios
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Consulte instruções biomecânicas, histórico de carga e cadastre novos exercícios.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition active:scale-95 shadow-sm shadow-lime-950/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Exercício</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar exercício por nome, músculo ou aparelho..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-lime-400 focus:outline-hidden"
            />
          </div>

          {/* Favorites Filter Button */}
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
              favoritesOnly
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${favoritesOnly ? 'fill-current text-red-400' : ''}`} />
            <span>Favoritos</span>
          </button>
        </div>

        {/* Muscle Group Horizontal Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {muscleFilters.map((tab) => {
            const active = selectedMuscle === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedMuscle(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                  active
                    ? 'bg-lime-400 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 bg-zinc-900/60 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exercises Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredExercises.map((exercise) => {
          return (
            <div
              key={exercise.id}
              onClick={() => setSelectedExerciseForDetail(exercise)}
              className="cursor-pointer flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4.5 hover:border-zinc-700 transition shadow-lg group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-lime-400 uppercase">
                    {MUSCLE_GROUP_LABELS[exercise.targetMuscleGroup]}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(exercise.id);
                    }}
                    className={`p-1 rounded-md transition ${
                      exercise.isFavorite ? 'text-red-400' : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${exercise.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <h3 className="font-bold text-base text-white group-hover:text-lime-400 transition-colors line-clamp-1">
                  {exercise.name}
                </h3>

                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {exercise.instructions}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-between text-xs text-zinc-500">
                <span>{EQUIPMENT_LABELS[exercise.equipment]}</span>
                <span className="flex items-center gap-0.5 font-bold text-lime-400 group-hover:translate-x-0.5 transition-transform">
                  Ver detalhes
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredExercises.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-400">
          <Dumbbell className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-zinc-200">Nenhum exercício encontrado</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Não encontramos nenhum exercício correspondente aos filtros aplicados. Você pode cadastrar um exercício novo agora.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition"
          >
            Cadastrar Exercício
          </button>
        </div>
      )}

      {/* Exercise Detail Modal */}
      {selectedExerciseForDetail && (
        <ExerciseDetailModal
          exercise={selectedExerciseForDetail}
          logs={logs}
          isOpen={true}
          onToggleFavorite={onToggleFavorite}
          onClose={() => setSelectedExerciseForDetail(null)}
        />
      )}

      {/* Create Exercise Modal */}
      <CreateExerciseModal
        isOpen={isCreateModalOpen}
        onSave={onSaveExercise}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
