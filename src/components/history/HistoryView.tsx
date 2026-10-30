import React, { useState, useMemo, useEffect } from 'react';
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
  MoreHorizontal,
  Zap,
  Moon,
  Circle,
  ArrowUpRight,
} from 'lucide-react';
import { WorkoutLog, WorkoutRoutine } from '../../types';
import { formatVolume, formatWeight, MUSCLE_GROUP_LABELS } from '../../utils/formatters';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryViewProps {
  logs: WorkoutLog[];
  routines: WorkoutRoutine[];
  onDeleteLog: (id: string) => void;
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const WEEK_DAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'] as const;

type DayStatus = 'completed' | 'planned' | 'rest' | 'none';

interface CalendarDayData {
  dayNumber: number | null;
  dateString: string | null;
  isToday: boolean;
  isCurrentMonth: boolean;
  status: DayStatus;
  logs: WorkoutLog[];
  scheduledRoutine: WorkoutRoutine | null;
}

interface SelectedDayDetail {
  dateString: string;
  date: Date;
  logs: WorkoutLog[];
  scheduledRoutine: WorkoutRoutine | null;
  status: DayStatus;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ logs, routines, onDeleteLog }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<WorkoutLog | null>(null);
  const [logIdToDelete, setLogIdToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDay, setSelectedDay] = useState<SelectedDayDetail | null>(null);

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDay(null);
  };

  // Calendar math for current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const todayString = new Date().toISOString().split('T')[0];

  // Create calendar cells (42 cells: 6 rows of 7)
  const calendarDays = useMemo((): CalendarDayData[] => {
    const days: CalendarDayData[] = [];

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const date = new Date(year, month - 1, dayNum);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const scheduledRoutine = routines.find((r) => r.dayOfWeek === dayOfWeek);
      const dayLogs = logs.filter((l) => l.date.startsWith(dateString));
      const hasCompletedWorkout = dayLogs.length > 0;
      const isRestDay = scheduledRoutine?.isRestDay && !hasCompletedWorkout;

      days.push({
        dayNumber: dayNum,
        dateString,
        isToday: false,
        isCurrentMonth: false,
        status: hasCompletedWorkout ? 'completed' : isRestDay ? 'rest' : scheduledRoutine ? 'planned' : 'none',
        logs: dayLogs,
        scheduledRoutine: scheduledRoutine || null,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateString = `${year}-${monthStr}-${dayStr}`;
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      const scheduledRoutine = routines.find((r) => r.dayOfWeek === dayOfWeek);
      const dayLogs = logs.filter((l) => l.date.startsWith(dateString));
      const hasCompletedWorkout = dayLogs.length > 0;
      const isRestDay = scheduledRoutine?.isRestDay && !hasCompletedWorkout;
      const isToday = dateString === todayString;

      days.push({
        dayNumber: d,
        dateString,
        isToday,
        isCurrentMonth: true,
        status: hasCompletedWorkout ? 'completed' : isRestDay ? 'rest' : scheduledRoutine ? 'planned' : 'none',
        logs: dayLogs,
        scheduledRoutine: scheduledRoutine || null,
      });
    }

    // Next month leading days to fill 42 cells (6 weeks)
    const remainingCells = 42 - days.length;
    for (let d = 1; d <= remainingCells; d++) {
      const date = new Date(year, month + 1, d);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const scheduledRoutine = routines.find((r) => r.dayOfWeek === dayOfWeek);
      const dayLogs = logs.filter((l) => l.date.startsWith(dateString));
      const hasCompletedWorkout = dayLogs.length > 0;
      const isRestDay = scheduledRoutine?.isRestDay && !hasCompletedWorkout;

      days.push({
        dayNumber: d,
        dateString,
        isToday: false,
        isCurrentMonth: false,
        status: hasCompletedWorkout ? 'completed' : isRestDay ? 'rest' : scheduledRoutine ? 'planned' : 'none',
        logs: dayLogs,
        scheduledRoutine: scheduledRoutine || null,
      });
    }

    return days;
  }, [year, month, firstDayIndex, daysInMonth, daysInPrevMonth, logs, routines, todayString]);

  const monthName = currentMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  // Handle day selection
  const handleDayClick = (day: CalendarDayData) => {
    if (!day.dateString || !day.isCurrentMonth) return;
    
    const dayLogs = logs.filter((l) => l.date.startsWith(day.dateString!));
    const dayOfWeek = new Date(day.dateString + 'T12:00:00').getDay();
    const scheduledRoutine = routines.find((r) => r.dayOfWeek === dayOfWeek);
    const hasCompletedWorkout = dayLogs.length > 0;
    const isRestDay = scheduledRoutine?.isRestDay && !hasCompletedWorkout;

    let status: DayStatus = 'none';
    if (hasCompletedWorkout) status = 'completed';
    else if (isRestDay) status = 'rest';
    else if (scheduledRoutine) status = 'planned';

    setSelectedDay({
      dateString: day.dateString,
      date: new Date(day.dateString + 'T12:00:00'),
      logs: dayLogs,
      scheduledRoutine: scheduledRoutine || null,
      status,
    });
  };

  // Format date for display
  const formatDateFull = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Status label helpers
  const getStatusLabel = (status: DayStatus) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'planned': return 'Planejado';
      case 'rest': return 'Descanso';
      default: return 'Sem registro';
    }
  };

  const getStatusColor = (status: DayStatus) => {
    switch (status) {
      case 'completed': return 'text-lime-400 bg-lime-400/10 border-lime-400/30';
      case 'planned': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30';
      case 'rest': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      default: return 'text-zinc-500 bg-zinc-800/50 border-zinc-800';
    }
  };

  const getStatusIcon = (status: DayStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'planned': return <Zap className="w-4 h-4" />;
      case 'rest': return <Moon className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  // Cell status indicator
  const getCellStatusIndicator = (status: DayStatus, isToday: boolean) => {
    if (isToday) return <div className="w-1.5 h-1.5 rounded-full bg-lime-400 ring-2 ring-zinc-900" />;
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />;
      case 'planned':
        return <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />;
      case 'rest':
        return <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />;
      default:
        return null;
    }
  };

  // Abbreviated routine name for cell
  const getAbbreviatedName = (name: string) => {
    const parts = name.split(':');
    return parts[0].trim();
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white truncate">
            Histórico
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Consulte seus treinos anteriores e sua evolução
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('calendar')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              viewMode === 'calendar'
                ? 'bg-lime-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Calendário
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
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
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-4"
        >
          {/* Calendar Month Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-lime-400" />
              <h2 className="text-base sm:text-lg font-bold text-white capitalize">
                {monthName}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 transition-all duration-200"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-lime-400/20 hover:text-lime-400 hover:border-lime-400/50 transition-all duration-200 text-xs font-medium hidden sm:inline-flex"
              >
                Hoje
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 transition-all duration-200"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/50">
              {WEEK_DAYS.map((dayName, idx) => (
                <div
                  key={idx}
                  className="py-2 text-[11px] font-bold text-white uppercase tracking-wider text-center border-r border-zinc-800/50 last:border-r-0"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Weeks */}
            <div className="grid grid-cols-7">
              {calendarDays.map((cell, idx) => {
                const isCurrentMonth = cell.isCurrentMonth;
                const isToday = cell.isToday;
                const status = cell.status;

                const baseClasses = `
                  min-h-[72px] max-h-[88px] p-1.5 flex flex-col justify-between text-left transition-all duration-200
                  border-r border-b border-zinc-800/50
                  ${idx % 7 === 6 ? 'border-r-0' : ''}
                  ${idx >= 35 ? 'border-b-0' : ''}
                `;

                const statusClasses = `
                  ${isToday ? 'bg-lime-400/5 border-lime-400/20' : ''}
                  ${status === 'completed' && !isToday ? 'bg-zinc-950/80 hover:bg-zinc-900' : ''}
                  ${status === 'planned' && !isToday ? 'bg-zinc-950/50 hover:bg-zinc-900/80' : ''}
                  ${status === 'rest' && !isToday ? 'bg-zinc-950/30 hover:bg-zinc-900/50' : ''}
                  ${status === 'none' && !isToday ? 'bg-zinc-950/20 hover:bg-zinc-900/30' : ''}
                  ${!isCurrentMonth ? 'opacity-40' : 'opacity-100'}
                `;

                return (
                  <motion.button
                    key={idx}
                    onClick={() => handleDayClick(cell)}
                    disabled={!isCurrentMonth}
                    className={`${baseClasses} ${statusClasses} ${isCurrentMonth ? 'hover:shadow-[0_0_0_1px_rgba(163,230,53,0.3)]' : 'cursor-not-allowed'}`}
                    whileTap={{ scale: isCurrentMonth ? 0.98 : 1 }}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isToday
                            ? 'text-lime-400'
                            : status === 'completed'
                            ? 'text-white'
                            : status === 'planned'
                            ? 'text-cyan-400'
                            : status === 'rest'
                            ? 'text-amber-400'
                            : isCurrentMonth
                            ? 'text-white'
                            : 'text-zinc-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {getCellStatusIndicator(status, isToday)}
                    </div>

                    {/* Cell content */}
                    <div className="space-y-0.5 mt-1 min-h-[36px]">
                      {cell.logs.length > 0 ? (
                        cell.logs.slice(0, 2).map((log, logIdx) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="truncate rounded bg-lime-400/15 hover:bg-lime-400/25 text-lime-400 text-[10px] font-medium px-1.5 py-0.5 text-left transition-all"
                          >
                            {getAbbreviatedName(log.routineName)}
                          </motion.div>
                        ))
                      ) : cell.scheduledRoutine?.isRestDay ? (
                        <span className="text-[10px] text-zinc-600 block truncate">Descanso</span>
                      ) : cell.scheduledRoutine ? (
                        <span className="text-[10px] text-zinc-600 truncate block">
                          {getAbbreviatedName(cell.scheduledRoutine.name)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-700 block truncate">Livre</span>
                      )}

                      {cell.logs.length > 2 && (
                        <span className="text-[9px] text-zinc-500 block truncate">
                          +{cell.logs.length - 2} mais
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details Panel */}
          <AnimatePresence mode="wait">
            {selectedDay && (
              <motion.div
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono font-bold text-lime-400">
                      {formatDateFull(selectedDay.dateString)}
                    </span>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedDay.status)}`}
                      >
                        {getStatusIcon(selectedDay.status)}
                        {getStatusLabel(selectedDay.status)}
                      </span>
                      {selectedDay.logs.length > 0 && (
                        <span className="text-xs text-zinc-400">
                          {selectedDay.logs.length} sessão{selectedDay.logs.length > 1 ? 'ões' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition shrink-0"
                    aria-label="Fechar detalhes"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Logs or Planned Routine */}
                {selectedDay.logs.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDay.logs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 }}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white">{log.routineName}</h4>
                          <div className="flex items-center gap-2">
                            <div className="text-right hidden sm:block">
                              <div className="text-sm font-bold text-lime-400 font-mono">
                                {formatVolume(log.totalVolumeKg)}
                              </div>
                              <div className="text-[10px] text-zinc-500">volume</div>
                            </div>
                            <button
                              onClick={() => setSelectedLogForDetail(log)}
                              className="p-2 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                              title="Ver detalhes completos"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {log.durationMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {log.totalSetsCompleted} séries
                          </span>
                          <span className="text-lime-400 font-mono font-bold">
                            {new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-zinc-800">
                          {log.exercises.slice(0, 3).map((ex, exIdx) => (
                            <div key={exIdx} className="flex items-center justify-between text-sm">
                              <span className="text-zinc-300 truncate pr-2">{ex.exerciseName}</span>
                              <div className="flex items-center gap-2 text-xs font-mono text-lime-400 shrink-0">
                                {ex.completedSets.map((s) => (
                                  <span key={s.setNumber} className="bg-zinc-900 px-1.5 py-0.5 rounded">
                                    {s.weightKg}kg×{s.reps}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                          {log.exercises.length > 3 && (
                            <span className="text-xs text-zinc-500">
                              +{log.exercises.length - 3} exercícios
                            </span>
                          )}
                        </div>

                        {log.notes && (
                          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">
                            <strong className="text-white block mb-1">Observações:</strong>
                            {log.notes}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : selectedDay.scheduledRoutine ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                    <h4 className="font-bold text-white">Treino planejado: {selectedDay.scheduledRoutine.name}</h4>
                    <p className="text-sm text-zinc-400">{selectedDay.scheduledRoutine.description}</p>
                    
                    {selectedDay.scheduledRoutine.isRestDay ? (
                      <div className="flex items-center gap-2 text-amber-400">
                        <Moon className="w-5 h-5" />
                        <span>Dia de descanso programado</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {selectedDay.scheduledRoutine.estimatedMinutes || 'Duração estimada não definida'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {selectedDay.scheduledRoutine.totalPlannedSets || selectedDay.scheduledRoutine.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} séries planejadas
                          </span>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-zinc-800">
                          {selectedDay.scheduledRoutine.exercises.slice(0, 4).map((ex, exIdx) => (
                            <div key={exIdx} className="flex items-center justify-between text-sm">
                              <span className="text-zinc-300 truncate pr-2">{ex.exerciseName}</span>
                              <span className="text-xs text-zinc-500 font-mono shrink-0">
                                {ex.sets.length} séries · {ex.sets[0]?.targetWeightKg || 0}kg × {ex.sets[0]?.targetReps || 0}
                              </span>
                            </div>
                          ))}
                          {selectedDay.scheduledRoutine.exercises.length > 4 && (
                            <span className="text-xs text-zinc-500">
                              +{selectedDay.scheduledRoutine.exercises.length - 4} exercícios
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-zinc-400">
                    <Dumbbell className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                    <p className="text-sm font-semibold text-zinc-300">Nenhum treino registrado</p>
                    <p className="text-xs text-zinc-500 mt-1">Este dia está livre para treinamento</p>
                  </div>
                )}

                {/* Legend */}
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-[11px] text-zinc-500 mb-2 font-medium">Legenda do calendário</p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-lime-400" />
                      Treino concluído
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      Treino planejado
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      Descanso
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <div className="w-5 h-5 rounded border border-lime-400/20 bg-lime-400/5 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-lime-400" />
                      </div>
                      Hoje
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* List View */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-3"
        >
          {logs.length > 0 ? (
            // Group logs by date
            (() => {
              const groupedLogs = new Map<string, WorkoutLog[]>();
              logs.forEach((log) => {
                const dateKey = log.date.split('T')[0];
                if (!groupedLogs.has(dateKey)) groupedLogs.set(dateKey, []);
                groupedLogs.get(dateKey)!.push(log);
              });

              const sortedDates = Array.from(groupedLogs.keys()).sort((a, b) => 
                new Date(b).getTime() - new Date(a).getTime()
              );

              return (
                <>
                  {sortedDates.map((dateKey) => {
                    const dayLogs = groupedLogs.get(dateKey)!;
                    const date = new Date(dateKey + 'T12:00:00');
                    
                    return (
                      <motion.div
                        key={dateKey}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.02 }}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden"
                      >
                        {/* Date Header */}
                        <div className="px-4 py-3 bg-zinc-950/50 border-b border-zinc-800/50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-lime-400">
                              {date.toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}
                            </span>
                            <span className="text-xs text-zinc-400 font-medium">
                              {dayLogs.length} sessão{dayLogs.length > 1 ? 'ões' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Logs for this date */}
                        <div className="divide-y divide-zinc-800">
                          {dayLogs.map((log) => (
                            <button
                              key={log.id}
                              onClick={() => setSelectedLogForDetail(log)}
                              className="w-full p-4 flex items-center justify-between hover:bg-zinc-950/50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 font-bold">
                                  <Dumbbell className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-base font-bold text-white truncate">{log.routineName}</h3>
                                  <p className="text-xs text-zinc-400 truncate">
                                    {log.durationMinutes} min • {log.totalSetsCompleted} séries • {formatVolume(log.totalVolumeKg)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right hidden sm:block">
                                  <div className="text-sm font-bold text-lime-400 font-mono">
                                    {formatVolume(log.totalVolumeKg)}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">volume</div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-zinc-500" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              );
            })()
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-400">
              <Dumbbell className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-sm font-semibold text-zinc-300">Nenhum treino no histórico</p>
              <p className="text-xs text-zinc-500 mt-1">Complete uma sessão para vê-la aqui</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Read-Only Session Detail Modal */}
      <AnimatePresence>
        {selectedLogForDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl my-8 text-zinc-100 max-h-[90vh] flex flex-col"
            >
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
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
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
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2"
                  >
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
                  </motion.div>
                ))}

                {selectedLogForDetail.notes && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300"
                  >
                    <strong className="text-white block mb-1">Observações do Treino:</strong>
                    {selectedLogForDetail.notes}
                  </motion.div>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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