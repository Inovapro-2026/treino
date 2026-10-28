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
  isMultiarticular?: boolean;
  isUnilateral?: boolean;
  isCustom?: boolean;
  isFavorite?: boolean;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  targetReps: number;
  minReps?: number;
  maxReps?: number;
  repsRange?: string; // ex: '8-12', '10-15', '12-20'
  targetWeightKg: number;
  restSeconds: number;
  completed: boolean;
  skipped?: boolean;
  actualReps?: number | string;
  repsLeft?: number | string; // Para exercícios unilaterais como Afundo
  repsRight?: number | string; // Para exercícios unilaterais como Afundo
  actualWeightKg?: number | string;
  completedAt?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  targetMuscleGroup: MuscleGroup;
  sets: WorkoutSet[];
  notes?: string;
  repsRange?: string;
  isUnilateral?: boolean;
  isMultiarticular?: boolean;
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
  planName?: string;
  estimatedMinutes?: string; // ex: '60 a 75 min'
  totalPlannedSets?: number;
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
  isStarted?: boolean;
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
  isUnilateral?: boolean;
  completedSets: {
    setNumber: number;
    weightKg: number;
    reps: number;
    repsLeft?: number;
    repsRight?: number;
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

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  pinSalt: string;
  pinHash: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}
