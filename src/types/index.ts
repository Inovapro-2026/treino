export type MuscleGroup =
  | 'peito'
  | 'costas'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'posteriores'
  | 'gluteos'
  | 'panturrilhas'
  | 'abdomen'
  | 'membros_superiores'
  | 'geral';

export type Equipment =
  | 'barra'
  | 'halteres'
  | 'maquina'
  | 'cabo'
  | 'peso_corporal'
  | 'elastico'
  | 'outro';

export interface Exercise {
  id: string;
  name: string;
  targetMuscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: Equipment;
  instructions: string;
  tips?: string;
  isCustom?: boolean;
  isFavorite?: boolean;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  targetReps: number;
  targetWeightKg: number;
  restSeconds: number;
  completed: boolean;
  actualReps?: number;
  actualWeightKg?: number;
  completedAt?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  targetMuscleGroup: MuscleGroup;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  description: string;
  dayOfWeek: number; // 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
  isRestDay: boolean;
  exercises: WorkoutExercise[];
  targetMuscleGroups: MuscleGroup[];
  color?: string;
}

export interface ActiveRestTimer {
  active: boolean;
  targetTimestamp: number;
  durationSeconds: number;
  startedAt: number;
  isPaused: boolean;
  remainingSecondsWhenPaused?: number;
  exerciseName: string;
  setIndex: number;
}

export interface ActiveWorkoutSession {
  id: string;
  routineId: string;
  routineName: string;
  startTime: number;
  pausedAt?: number;
  totalPausedDurationMs: number;
  currentExerciseIndex: number;
  exercises: WorkoutExercise[];
  restTimer?: ActiveRestTimer;
  isCompleted: boolean;
  notes?: string;
}

export interface CompletedExerciseLog {
  exerciseId: string;
  exerciseName: string;
  targetMuscleGroup: MuscleGroup;
  completedSets: {
    setNumber: number;
    weightKg: number;
    reps: number;
  }[];
}

export interface WorkoutLog {
  id: string;
  routineId: string;
  routineName: string;
  date: string;
  durationMinutes: number;
  totalVolumeKg: number;
  totalSetsCompleted: number;
  exercises: CompletedExerciseLog[];
  notes?: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  hipCm?: number;
  calfCm?: number;
  notes?: string;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  accentColor: 'lime' | 'emerald' | 'amber' | 'cyan';
  defaultRestSeconds: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  weightUnit: 'kg' | 'lbs';
  autoStartRest: boolean;
  weeklyWorkoutGoal: number;
  userName: string;
  motivationalMessage: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  syncStatus: 'local' | 'synced' | 'pending' | 'error';
  lastSyncTimestamp?: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  maxVolumeSessionKg: number;
  dateAchieved: string;
}
