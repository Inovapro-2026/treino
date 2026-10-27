import React from 'react';
import {
  Play,
  Calendar,
  Flame,
  Dumbbell,
  Clock,
  TrendingUp,
  Scale,
  Award,
  ChevronRight,
  Info,
  CheckCircle,
  Plus,
} from 'lucide-react';
import {
  WorkoutRoutine,
  WorkoutLog,
  BodyMeasurement,
  UserSettings,
} from '../../types';
import {
  formatDatePortuguese,
  formatVolume,
  formatWeight,
  DAY_NAMES,
  SHORT_DAY_NAMES,
  MUSCLE_GROUP_LABELS,
} from '../../utils/formatters';

interface DashboardProps {
  routines: WorkoutRoutine[];
  logs: WorkoutLog[];
  measurements: BodyMeasurement[];
  settings: UserSettings;
  streakCount: number;
  onStartWorkout: (routine: WorkoutRoutine) => void;
  onNavigateTab: (tab: any) => void;
  onOpenNewMeasurement: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  routines,
  logs,
  measurements,
  settings,
  streakCount,
  onStartWorkout,
  onNavigateTab,
  onOpenNewMeasurement,
}) => {
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda...

  // Identify today's scheduled workout
  const todayRoutine = routines.find((r) => r.dayOfWeek === currentDayOfWeek);

  // If today is rest day or completed, find next scheduled workout day
  const nextTrainingRoutine = React.useMemo(() => {
    if (todayRoutine && !todayRoutine.isRestDay) {
      return todayRoutine;
    }
    for (let offset = 1; offset <= 7; offset++) {
      const nextDay = (currentDayOfWeek + offset) % 7;
      const r = routines.find((item) => item.dayOfWeek === nextDay);
      if (r && !r.isRestDay) return r;
    }
    return routines.find((r) => !r.isRestDay) || routines[0];
  }, [routines, todayRoutine, currentDayOfWeek]);

  // Check if today's workout was already completed today
  const todayDateString = today.toISOString().split('T')[0];
  const workoutDoneToday = logs.some((l) => l.date.startsWith(todayDateString));

  // Current Week Analytics (Monday to Sunday)
  const currentWeekStats = React.useMemo(() => {
    const d = new Date(today);
    const day = d.getDay();
    // In pt-BR locale, Monday is day 1, Sunday is day 7
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const weekLogs = logs.filter((l) => new Date(l.date) >= monday);
    const completedCount = weekLogs.length;
    const totalVolume = weekLogs.reduce((acc, l) => acc + (l.totalVolumeKg || 0), 0);
    const totalMinutes = weekLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);

    // Days of this week mapped to volume
    const weekDaysData = [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
      const dayLogs = weekLogs.filter((l) => new Date(l.date).getDay() === dayIndex);
      const dayVolume = dayLogs.reduce((acc, l) => acc + l.totalVolumeKg, 0);
      return {
        dayIndex,
        label: SHORT_DAY_NAMES[dayIndex],
        completed: dayLogs.length > 0,
        volume: dayVolume,
      };
    });

    return {
      completedCount,
      totalVolume,
      totalMinutes,
      weekDaysData,
    };
  }, [logs, today]);

  // Latest weight and previous delta
  const latestWeight = measurements.find((m) => m.weightKg !== undefined);
  const previousWeight = measurements.filter((m) => m.weightKg !== undefined)[1];
  const weightDelta =
    latestWeight?.weightKg && previousWeight?.weightKg
      ? (latestWeight.weightKg - previousWeight.weightKg).toFixed(1)
      : null;

  // Max volume for weekly chart scale
  const maxWeeklyVolume = Math.max(
    ...currentWeekStats.weekDaysData.map((d) => d.volume),
    1000
  );

  return (
    <div className="space-y-6">
      {/* Top Greeting & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Olá, {settings.userName || 'Atleta'}!
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 capitalize">
            {formatDatePortuguese(today)}
          </p>
        </div>

        {/* Motivational Banner */}
        {settings.motivationalMessage && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs text-zinc-300 max-w-md">
            <span className="font-semibold text-lime-400">Meta diária: </span>
            {settings.motivationalMessage}
          </div>
        )}
      </div>

      {/* Featured Workout Card (Hero) */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-lime-400/20 px-2.5 py-1 text-xs font-bold text-lime-400 uppercase tracking-wide">
                {todayRoutine && !todayRoutine.isRestDay
                  ? 'Treino de Hoje'
                  : 'Próximo Treino'}
              </span>
              <span className="text-xs text-zinc-400">
                {DAY_NAMES[nextTrainingRoutine?.dayOfWeek ?? currentDayOfWeek]}
              </span>
              {workoutDoneToday && (
                <span className="flex items-center gap-1 text-xs font-semibold text-lime-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Concluído hoje!
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {todayRoutine?.isRestDay
                ? 'Descanso Programado'
                : todayRoutine?.name || nextTrainingRoutine?.name}
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
              {todayRoutine?.isRestDay
                ? 'O descanso faz parte do processo de hipertrofia. Regeneração muscular, síntese protéica e recuperação do SNC. Se desejar, você pode antecipar outro treino.'
                : todayRoutine?.description || nextTrainingRoutine?.description}
            </p>

            {/* Muscle Groups Covered */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(todayRoutine?.isRestDay
                ? nextTrainingRoutine?.targetMuscleGroups
                : todayRoutine?.targetMuscleGroups || []
              )?.map((mg) => (
                <span
                  key={mg}
                  className="rounded-lg bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300"
                >
                  {MUSCLE_GROUP_LABELS[mg]}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2.5 shrink-0">
            {todayRoutine && !todayRoutine.isRestDay ? (
              <button
                onClick={() => onStartWorkout(todayRoutine)}
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-lime-400 px-6 py-4 text-base font-extrabold text-zinc-950 shadow-lg shadow-lime-950/40 transition hover:bg-lime-300 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{workoutDoneToday ? 'Repetir Treino' : 'Iniciar Treino'}</span>
              </button>
            ) : nextTrainingRoutine ? (
              <button
                onClick={() => onStartWorkout(nextTrainingRoutine)}
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-lime-400 px-6 py-4 text-base font-extrabold text-zinc-950 shadow-lg shadow-lime-950/40 transition hover:bg-lime-300 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Treinar Agora</span>
              </button>
            ) : null}

            <button
              onClick={() => onNavigateTab('routines')}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition"
            >
              <span>Ver Fichas Completas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Weekly Goal Progress */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold mb-2">
            <span>Frequência Semanal</span>
            <Calendar className="w-4 h-4 text-lime-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {currentWeekStats.completedCount}
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              / {settings.weeklyWorkoutGoal} treinos
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-lime-400 transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  (currentWeekStats.completedCount / settings.weeklyWorkoutGoal) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Weekly Volume Lifted */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold mb-2">
            <span>Volume Semanal</span>
            <Dumbbell className="w-4 h-4 text-lime-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {formatVolume(currentWeekStats.totalVolume)}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Carga total × repetições</p>
        </div>

        {/* Total Time Trained */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold mb-2">
            <span>Tempo em Treino</span>
            <Clock className="w-4 h-4 text-lime-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {currentWeekStats.totalMinutes}
            </span>
            <span className="text-xs text-zinc-400 font-medium">minutos</span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Nesta semana</p>
        </div>

        {/* Current Body Weight */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold mb-2">
            <span>Peso Corporal</span>
            <Scale className="w-4 h-4 text-lime-400" />
          </div>
          {latestWeight && latestWeight.weightKg ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  {formatWeight(latestWeight.weightKg, settings.weightUnit)}
                </span>
                {weightDelta !== null && (
                  <span
                    className={`text-xs font-bold ${
                      parseFloat(weightDelta) >= 0 ? 'text-lime-400' : 'text-zinc-400'
                    }`}
                  >
                    {parseFloat(weightDelta) >= 0 ? `+${weightDelta}` : weightDelta} kg
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Registrado em {latestWeight.date.split('-').reverse().slice(0, 2).join('/')}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-zinc-400">Nenhum peso</p>
              <button
                onClick={onOpenNewMeasurement}
                className="mt-2 text-xs font-bold text-lime-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar peso</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Performance Grid: Weekly Volume Graph & Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly Performance Bar Chart */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Desempenho da Semana</h3>
              <p className="text-xs text-zinc-400">Volume diário levantado (Seg a Dom)</p>
            </div>
            <span className="text-xs font-mono font-bold text-lime-400">
              {formatVolume(currentWeekStats.totalVolume)}
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="flex items-end justify-between gap-2 h-40 pt-4 px-2 border-b border-zinc-800">
            {currentWeekStats.weekDaysData.map((d, idx) => {
              const heightPercent =
                d.volume > 0 ? Math.max(12, Math.round((d.volume / maxWeeklyVolume) * 100)) : 0;
              const isToday = d.dayIndex === currentDayOfWeek;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-zinc-300 bg-zinc-800 rounded px-1.5 py-0.5 pointer-events-none whitespace-nowrap">
                    {d.volume > 0 ? `${Math.round(d.volume)} kg` : 'Sem treino'}
                  </div>

                  <div className="w-full max-w-[28px] bg-zinc-800 rounded-t-lg relative flex items-end overflow-hidden h-32">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday ? 'bg-lime-400' : d.volume > 0 ? 'bg-lime-500/80' : 'bg-transparent'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  <span
                    className={`text-xs font-semibold ${
                      isToday ? 'text-lime-400 font-bold' : 'text-zinc-400'
                    }`}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Workouts Log Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Últimos Treinos</h3>
              <p className="text-xs text-zinc-400">Histórico de sessões realizadas</p>
            </div>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs font-bold text-lime-400 hover:text-lime-300 flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {logs.length > 0 ? (
            <div className="space-y-2.5">
              {logs.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3.5 hover:border-zinc-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 font-bold">
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs">
                        {log.routineName}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {new Date(log.date).toLocaleDateString('pt-BR')} • {log.durationMinutes} min
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-white font-mono">
                      {formatVolume(log.totalVolumeKg)}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {log.totalSetsCompleted} séries
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-400">
              <Dumbbell className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-sm font-semibold text-zinc-300">Nenhum treino registrado ainda</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                Inicie seu primeiro treino para começar a alimentar seu histórico e gráficos de progressão de carga.
              </p>
              <button
                onClick={() => nextTrainingRoutine && onStartWorkout(nextTrainingRoutine)}
                className="mt-4 rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition"
              >
                Começar Treino
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
