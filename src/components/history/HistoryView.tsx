import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  CheckCircle2,
  Trash2,
  Eye,
  X,
  Award,
  Layers,
} from 'lucide-react';
import { WorkoutLog, WorkoutRoutine } from '../../types';
import { formatVolume, formatWeight, MUSCLE_GROUP_LABELS } from '../../utils/formatters';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface HistoryViewProps {
  logs: WorkoutLog[];
  routines: WorkoutRoutine[];
  onDeleteLog: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ logs, routines, onDeleteLog }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<WorkoutLog | null>(null);
  const [logIdToDelete, setLogIdToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Calendar math for current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create calendar cells (42 cells: 6 rows of 7)
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({ dayNumber: null, dateString: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateString = `${year}-${monthStr}-${dayStr}`;
    calendarDays.push({ dayNumber: d, dateString });
  }

  const monthName = currentMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Calendário & Histórico
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Consulte sessões passadas, cargas registradas e assiduidade nos treinos.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('calendar')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === 'calendar'
                ? 'bg-lime-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Calendário
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === 'list'
                ? 'bg-lime-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Lista ({logs.length})
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl space-y-4">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white capitalize flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-lime-400" />
              {monthName}
            </h2>

            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, idx) => (
              <div
                key={idx}
                className="py-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider"
              >
                {dayName}
              </div>
            ))}

            {calendarDays.map((cell, idx) => {
              if (!cell.dayNumber || !cell.dateString) {
                return (
                  <div
                    key={idx}
                    className="min-h-[64px] sm:min-h-[80px] rounded-xl bg-zinc-950/20 opacity-30 border border-zinc-900"
                  />
                );
              }

              const cellDate = new Date(`${cell.dateString}T12:00:00`);
              const dayOfWeek = cellDate.getDay();
              const scheduledRoutine = routines.find((r) => r.dayOfWeek === dayOfWeek);
              const dayLogs = logs.filter((l) => l.date.startsWith(cell.dateString!));
              const hasCompletedWorkout = dayLogs.length > 0;
              const isToday =
                new Date().toISOString().split('T')[0] === cell.dateString;

              return (
                <div
                  key={idx}
                  className={`min-h-[64px] sm:min-h-[80px] rounded-xl p-1.5 flex flex-col justify-between text-left transition border ${
                    isToday
                      ? 'border-lime-400 bg-lime-400/5'
                      : hasCompletedWorkout
                      ? 'border-zinc-700 bg-zinc-950/80 hover:border-lime-400/60'
                      : 'border-zinc-850 bg-zinc-950/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isToday
                          ? 'text-lime-400'
                          : hasCompletedWorkout
                          ? 'text-white'
                          : 'text-zinc-500'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasCompletedWorkout && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                    )}
                  </div>

                  {/* Cell workout pills */}
                  <div className="space-y-1 mt-1">
                    {hasCompletedWorkout ? (
                      dayLogs.map((log) => (
                        <button
                          key={log.id}
                          onClick={() => setSelectedLogForDetail(log)}
                          className="w-full truncate rounded bg-lime-400/20 hover:bg-lime-400/30 text-lime-400 text-[10px] font-bold px-1 py-0.5 text-left transition"
                        >
                          {log.routineName.split(':')[0]}
                        </button>
                      ))
                    ) : scheduledRoutine?.isRestDay ? (
                      <span className="text-[10px] text-zinc-600 block">Descanso</span>
                    ) : (
                      <span className="text-[10px] text-zinc-600 truncate block">
                        {scheduledRoutine?.name ? scheduledRoutine.name.split(':')[0] : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 font-bold">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{log.routineName}</h3>
                    <p className="text-xs text-zinc-400">
                      {new Date(log.date).toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      • {log.durationMinutes} minutos • {log.totalSetsCompleted} séries
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-lime-400 font-mono">
                      {formatVolume(log.totalVolumeKg)}
                    </div>
                    <div className="text-[11px] text-zinc-500">volume total</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedLogForDetail(log)}
                      className="p-2 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                      title="Ver detalhes do treino"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setLogIdToDelete(log.id)}
                      className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition"
                      title="Excluir do histórico"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-400">
              <Dumbbell className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-sm font-semibold text-zinc-300">Nenhum treino no histórico</p>
            </div>
          )}
        </div>
      )}

      {/* Read-Only Session Detail Modal */}
      {selectedLogForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl my-8 text-zinc-100 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-lime-400">
                  {new Date(selectedLogForDetail.date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <h2 className="text-xl font-extrabold text-white mt-0.5">
                  {selectedLogForDetail.routineName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 py-4 border-b border-zinc-800 text-center">
              <div>
                <span className="text-[11px] text-zinc-500 uppercase font-bold">Duração</span>
                <div className="text-base font-extrabold text-white font-mono">
                  {selectedLogForDetail.durationMinutes} min
                </div>
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 uppercase font-bold">Volume Total</span>
                <div className="text-base font-extrabold text-lime-400 font-mono">
                  {formatVolume(selectedLogForDetail.totalVolumeKg)}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 uppercase font-bold">Séries</span>
                <div className="text-base font-extrabold text-white font-mono">
                  {selectedLogForDetail.totalSetsCompleted}
                </div>
              </div>
            </div>

            {/* Exercises List (Read-Only) */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {selectedLogForDetail.exercises.map((ex, idx) => (
                <div key={idx} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white">{ex.exerciseName}</h4>
                    <span className="text-xs text-zinc-400">
                      {MUSCLE_GROUP_LABELS[ex.targetMuscleGroup]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {ex.completedSets.map((s) => (
                      <div
                        key={s.setNumber}
                        className="rounded-lg bg-zinc-900 border border-zinc-800/80 p-2 text-center"
                      >
                        <span className="text-[10px] text-zinc-500 font-bold block">
                          Série {s.setNumber}
                        </span>
                        <span className="text-xs font-mono font-bold text-lime-400">
                          {s.weightKg} kg × {s.reps}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {selectedLogForDetail.notes && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300">
                  <strong className="text-white block mb-1">Observações do Treino:</strong>
                  {selectedLogForDetail.notes}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 pt-4 flex justify-end">
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="rounded-xl bg-zinc-800 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-700 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Log Confirmation */}
      <ConfirmationModal
        isOpen={logIdToDelete !== null}
        title="Excluir Registro de Treino?"
        description="Esta sessão será apagada do histórico e as métricas de volume calculadas serão recalculadas."
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={() => {
          if (logIdToDelete) onDeleteLog(logIdToDelete);
          setLogIdToDelete(null);
        }}
        onCancel={() => setLogIdToDelete(null)}
      />
    </div>
  );
};
