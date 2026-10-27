import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Dumbbell,
  Scale,
  Calendar,
  Layers,
  Award,
  Filter,
  BarChart3,
  Flame,
  Info,
} from 'lucide-react';
import { WorkoutLog, BodyMeasurement, Exercise } from '../../types';
import { formatVolume, formatWeight, MUSCLE_GROUP_LABELS } from '../../utils/formatters';

interface AnalyticsViewProps {
  logs: WorkoutLog[];
  measurements: BodyMeasurement[];
  exercises: Exercise[];
}

type Period = '7d' | '30d' | '90d' | 'all';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ logs, measurements, exercises }) => {
  const [period, setPeriod] = useState<Period>('30d');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    exercises[0]?.id || 'supino_reto_barra'
  );
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    value: string;
  } | null>(null);

  // Filter cutoff date
  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (period === '7d') {
      return new Date(now.setDate(now.getDate() - 7));
    }
    if (period === '30d') {
      return new Date(now.setDate(now.getDate() - 30));
    }
    if (period === '90d') {
      return new Date(now.setDate(now.getDate() - 90));
    }
    return new Date(0); // 'all'
  }, [period]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter((l) => new Date(l.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [logs, cutoffDate]);

  // Filtered measurements
  const filteredMeasurements = useMemo(() => {
    return measurements
      .filter((m) => new Date(m.date) >= cutoffDate && m.weightKg !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [measurements, cutoffDate]);

  // Exercise progression data for selected exercise
  const exerciseProgression = useMemo(() => {
    const points: { date: string; maxWeight: number; repsAtMax: number; volume: number }[] = [];
    for (const log of filteredLogs) {
      const match = log.exercises.find((e) => e.exerciseId === selectedExerciseId);
      if (match && match.completedSets.length > 0) {
        let maxW = 0;
        let repsAtM = 0;
        let totalVol = 0;
        for (const s of match.completedSets) {
          totalVol += s.weightKg * s.reps;
          if (s.weightKg >= maxW) {
            maxW = s.weightKg;
            repsAtM = s.reps;
          }
        }
        points.push({
          date: log.date.split('T')[0],
          maxWeight: maxW,
          repsAtMax: repsAtM,
          volume: totalVol,
        });
      }
    }
    return points;
  }, [filteredLogs, selectedExerciseId]);

  // Muscle group set distribution
  const muscleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of filteredLogs) {
      for (const ex of log.exercises) {
        const mg = ex.targetMuscleGroup;
        counts[mg] = (counts[mg] || 0) + ex.completedSets.length;
      }
    }
    return Object.entries(counts)
      .map(([mg, count]) => ({
        muscle: mg,
        label: MUSCLE_GROUP_LABELS[mg as keyof typeof MUSCLE_GROUP_LABELS] || mg,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLogs]);

  // Total summary stats
  const totalVolumeInPeriod = filteredLogs.reduce((acc, l) => acc + (l.totalVolumeKg || 0), 0);
  const totalSetsInPeriod = filteredLogs.reduce((acc, l) => acc + (l.totalSetsCompleted || 0), 0);
  const totalWorkoutsInPeriod = filteredLogs.length;

  return (
    <div className="space-y-6">
      {/* Header & Period Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Análise e Evolução Física
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Acompanhamento de volume, cargas por exercício e medidas corporais.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1 self-start sm:self-auto">
          {(['7d', '30d', '90d', 'all'] as Period[]).map((p) => {
            const labels: Record<Period, string> = {
              '7d': '7 Dias',
              '30d': '30 Dias',
              '90d': '90 Dias',
              all: 'Todo Histórico',
            };
            const active = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-lime-400 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Period High-Level Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Treinos Realizados
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {totalWorkoutsInPeriod}
            </span>
            <span className="text-xs text-zinc-400">sessões</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Volume Acumulado
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-lime-400">
              {formatVolume(totalVolumeInPeriod)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">Carga total levantada</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Séries Concluídas
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {totalSetsInPeriod}
            </span>
            <span className="text-xs text-zinc-400">séries</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Média por Treino
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {totalWorkoutsInPeriod > 0
                ? Math.round(totalSetsInPeriod / totalWorkoutsInPeriod)
                : 0}
            </span>
            <span className="text-xs text-zinc-400">séries/sessão</span>
          </div>
        </div>
      </div>

      {/* Chart 1: Volume Per Session */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-lime-400" />
              Volume de Treino por Sessão (kg)
            </h3>
            <p className="text-xs text-zinc-400">
              Calculado como Carga (kg) × Repetições completadas em cada série.
            </p>
          </div>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="pt-2">
            <div className="h-56 w-full flex items-end gap-2 border-b border-zinc-800 pb-2 px-2">
              {(() => {
                const maxVol = Math.max(...filteredLogs.map((l) => l.totalVolumeKg), 100);
                return filteredLogs.map((log) => {
                  const heightPercent = Math.max(10, Math.round((log.totalVolumeKg / maxVol) * 100));
                  return (
                    <div
                      key={log.id}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg p-2 text-xs shadow-xl pointer-events-none whitespace-nowrap z-20">
                        <div className="font-bold text-lime-400">{log.routineName}</div>
                        <div>{new Date(log.date).toLocaleDateString('pt-BR')}</div>
                        <div className="font-mono">{formatVolume(log.totalVolumeKg)}</div>
                        <div className="text-zinc-400">{log.totalSetsCompleted} séries • {log.durationMinutes} min</div>
                      </div>

                      <div className="w-full max-w-[40px] bg-zinc-800/60 rounded-t-lg overflow-hidden flex items-end h-44">
                        <div
                          className="w-full bg-gradient-to-t from-lime-500 to-lime-400 rounded-t-lg transition-all duration-300 hover:brightness-110"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 mt-2 truncate w-full text-center">
                        {log.date.split('-').reverse().slice(0, 2).join('/')}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
            Nenhuma sessão registrada no período selecionado.
          </div>
        )}
      </div>

      {/* Chart 2: Exercise Load Progression */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-lime-400" />
              Evolução de Carga Máxima por Exercício
            </h3>
            <p className="text-xs text-zinc-400">
              Acompanhe sua sobrecarga progressiva em cada movimento da rotina.
            </p>
          </div>

          {/* Exercise Picker */}
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-white focus:border-lime-400 focus:outline-hidden"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        {exerciseProgression.length > 0 ? (
          <div className="pt-2">
            <div className="h-52 w-full flex items-end gap-3 border-b border-zinc-800 pb-2 px-2">
              {(() => {
                const maxLoad = Math.max(...exerciseProgression.map((p) => p.maxWeight), 10);
                return exerciseProgression.map((pt, idx) => {
                  const heightPercent = Math.max(15, Math.round((pt.maxWeight / maxLoad) * 100));
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg p-2 text-xs shadow-xl pointer-events-none whitespace-nowrap z-20">
                        <div className="font-bold text-lime-400">{pt.maxWeight} kg</div>
                        <div>{pt.repsAtMax} repetições</div>
                        <div className="text-zinc-400">{pt.date}</div>
                      </div>

                      <div className="w-full max-w-[36px] bg-zinc-800/60 rounded-t-lg overflow-hidden flex items-end h-40">
                        <div
                          className="w-full bg-lime-400 rounded-t-lg transition-all duration-300 hover:bg-lime-300"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 mt-2 truncate w-full text-center">
                        {pt.date.split('-').reverse().slice(0, 2).join('/')}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
            Nenhum registro para este exercício no período selecionado.
          </div>
        )}
      </div>

      {/* Grid: Muscle Group Distribution & Body Weight Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Muscle Distribution */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-lime-400" />
            Distribuição de Séries por Músculo
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Volume de trabalho direcionado para cada grupo muscular no período.
          </p>

          {muscleDistribution.length > 0 ? (
            <div className="space-y-3">
              {muscleDistribution.map((item) => {
                const maxCount = muscleDistribution[0]?.count || 1;
                const percent = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={item.muscle} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-200">{item.label}</span>
                      <span className="font-mono text-zinc-400 font-medium">
                        {item.count} séries
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-lime-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
              Nenhuma série realizada no período.
            </div>
          )}
        </div>

        {/* Body Weight Progress */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-lime-400" />
            Evolução do Peso Corporal
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Variação de massa corporal registrada ao longo do tempo.
          </p>

          {filteredMeasurements.length > 0 ? (
            <div className="space-y-2">
              <div className="h-44 w-full flex items-end gap-2 border-b border-zinc-800 pb-2 px-2">
                {(() => {
                  const minWeight = Math.min(...filteredMeasurements.map((m) => m.weightKg || 0));
                  const maxWeight = Math.max(...filteredMeasurements.map((m) => m.weightKg || 0));
                  const range = Math.max(2, maxWeight - minWeight);

                  return filteredMeasurements.map((m) => {
                    const diff = (m.weightKg || minWeight) - minWeight;
                    const heightPercent = Math.max(15, Math.round((diff / range) * 85) + 15);

                    return (
                      <div
                        key={m.id}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg p-2 text-xs shadow-xl pointer-events-none whitespace-nowrap z-20">
                          <div className="font-bold text-lime-400">{m.weightKg} kg</div>
                          <div className="text-zinc-400">{m.date}</div>
                        </div>

                        <div className="w-full max-w-[28px] bg-zinc-800/60 rounded-t-lg overflow-hidden flex items-end h-32">
                          <div
                            className="w-full bg-lime-400/90 rounded-t-lg transition-all duration-300 hover:bg-lime-300"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 mt-2 truncate w-full text-center">
                          {m.date.split('-').reverse().slice(0, 2).join('/')}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
              Nenhuma pesagem cadastrada no período selecionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
