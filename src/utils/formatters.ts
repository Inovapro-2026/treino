import { MuscleGroup, Equipment } from '../types';

export function formatSecondsToTime(seconds: number): string {
  if (seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatWeight(kg: number, unit: 'kg' | 'lbs' = 'kg'): string {
  if (unit === 'lbs') {
    const lbs = kg * 2.20462;
    return `${lbs.toFixed(1)} lbs`;
  }
  return `${kg} kg`;
}

export function formatVolume(volumeKg: number): string {
  if (volumeKg >= 1000) {
    return `${(volumeKg / 1000).toFixed(1)} t`;
  }
  return `${Math.round(volumeKg).toLocaleString('pt-BR')} kg`;
}

export function formatDatePortuguese(dateStrOrObj: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
  const defaultOpts: Intl.DateTimeFormatOptions = options || {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  return date.toLocaleDateString('pt-BR', defaultOpts);
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Quadríceps',
  posteriores: 'Posteriores',
  gluteos: 'Glúteos',
  panturrilhas: 'Panturrilhas',
  abdomen: 'Abdômen',
  membros_superiores: 'Membros Superiores',
  geral: 'Geral',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barra: 'Barra Olímpica',
  halteres: 'Halteres',
  maquina: 'Máquina',
  cabo: 'Cabo / Polia',
  peso_corporal: 'Peso Corporal',
  elastico: 'Elástico / Faixa',
  outro: 'Outro',
};

export const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const SHORT_DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
