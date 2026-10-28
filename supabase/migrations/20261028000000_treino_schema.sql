-- ==============================================================================
-- HyperPulse Treino — Supabase PostgreSQL Schema & Migrations
-- Arquitetura completa com Row Level Security (RLS) para todas as tabelas
-- ==============================================================================

-- 1. PROFILES (Perfis de usuários vinculados ao Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT 'Atleta',
  pin_salt text NOT NULL,
  pin_hash text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. USER SETTINGS (Configurações e preferências de treino)
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark',
  accent_color text NOT NULL DEFAULT 'lime',
  default_rest_seconds integer NOT NULL DEFAULT 90,
  sound_enabled boolean NOT NULL DEFAULT true,
  vibration_enabled boolean NOT NULL DEFAULT true,
  weight_unit text NOT NULL DEFAULT 'kg',
  auto_start_rest boolean NOT NULL DEFAULT true,
  weekly_workout_goal integer NOT NULL DEFAULT 5,
  user_name text NOT NULL DEFAULT 'Atleta',
  motivational_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. ROUTINES (Fichas e divisões de treino do usuário)
CREATE TABLE IF NOT EXISTS public.routines (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  day_of_week integer NOT NULL, -- 0=Domingo, 1=Segunda, etc.
  is_rest_day boolean NOT NULL DEFAULT false,
  color text,
  plan_name text DEFAULT 'Treino de Hipertrofia — Smart Fit',
  estimated_minutes text,
  total_planned_sets integer,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_muscle_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

-- 4. EXERCISES (Biblioteca de exercícios e customizados)
CREATE TABLE IF NOT EXISTS public.exercises (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_muscle_group text NOT NULL,
  secondary_muscles jsonb DEFAULT '[]'::jsonb,
  equipment text NOT NULL,
  instructions text,
  tips text,
  is_multiarticular boolean NOT NULL DEFAULT false,
  is_unilateral boolean NOT NULL DEFAULT false,
  is_custom boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

-- 5. WORKOUT LOGS (Sessões de treino concluídas no histórico)
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id text NOT NULL,
  routine_name text NOT NULL,
  date timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 0,
  total_volume_kg numeric(10, 2) NOT NULL DEFAULT 0,
  total_sets_completed integer NOT NULL DEFAULT 0,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

-- 6. BODY MEASUREMENTS (Evolução de medidas corporais)
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date timestamptz NOT NULL,
  weight_kg numeric(5, 2),
  waist_cm numeric(5, 2),
  chest_cm numeric(5, 2),
  arm_cm numeric(5, 2),
  thigh_cm numeric(5, 2),
  hip_cm numeric(5, 2),
  calf_cm numeric(5, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

-- 7. ACTIVE SESSIONS (Sessão de treino em andamento para sincronização entre aparelhos)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_routines_user_day ON public.routines(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON public.workout_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON public.body_measurements(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_user_group ON public.exercises(user_id, target_muscle_group);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) — ATIVAÇÃO E POLÍTICAS GRANULARES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- 2. Políticas para user_settings
DROP POLICY IF EXISTS "settings_select_own" ON public.user_settings;
CREATE POLICY "settings_select_own" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_insert_own" ON public.user_settings;
CREATE POLICY "settings_insert_own" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_update_own" ON public.user_settings;
CREATE POLICY "settings_update_own" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_delete_own" ON public.user_settings;
CREATE POLICY "settings_delete_own" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

-- 3. Políticas para routines
DROP POLICY IF EXISTS "routines_select_own" ON public.routines;
CREATE POLICY "routines_select_own" ON public.routines FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "routines_insert_own" ON public.routines;
CREATE POLICY "routines_insert_own" ON public.routines FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "routines_update_own" ON public.routines;
CREATE POLICY "routines_update_own" ON public.routines FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "routines_delete_own" ON public.routines;
CREATE POLICY "routines_delete_own" ON public.routines FOR DELETE USING (auth.uid() = user_id);

-- 4. Políticas para exercises
DROP POLICY IF EXISTS "exercises_select_own" ON public.exercises;
CREATE POLICY "exercises_select_own" ON public.exercises FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "exercises_insert_own" ON public.exercises;
CREATE POLICY "exercises_insert_own" ON public.exercises FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "exercises_update_own" ON public.exercises;
CREATE POLICY "exercises_update_own" ON public.exercises FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "exercises_delete_own" ON public.exercises;
CREATE POLICY "exercises_delete_own" ON public.exercises FOR DELETE USING (auth.uid() = user_id);

-- 5. Políticas para workout_logs
DROP POLICY IF EXISTS "logs_select_own" ON public.workout_logs;
CREATE POLICY "logs_select_own" ON public.workout_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "logs_insert_own" ON public.workout_logs;
CREATE POLICY "logs_insert_own" ON public.workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "logs_update_own" ON public.workout_logs;
CREATE POLICY "logs_update_own" ON public.workout_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "logs_delete_own" ON public.workout_logs;
CREATE POLICY "logs_delete_own" ON public.workout_logs FOR DELETE USING (auth.uid() = user_id);

-- 6. Políticas para body_measurements
DROP POLICY IF EXISTS "measurements_select_own" ON public.body_measurements;
CREATE POLICY "measurements_select_own" ON public.body_measurements FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "measurements_insert_own" ON public.body_measurements;
CREATE POLICY "measurements_insert_own" ON public.body_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "measurements_update_own" ON public.body_measurements;
CREATE POLICY "measurements_update_own" ON public.body_measurements FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "measurements_delete_own" ON public.body_measurements;
CREATE POLICY "measurements_delete_own" ON public.body_measurements FOR DELETE USING (auth.uid() = user_id);

-- 7. Políticas para active_sessions
DROP POLICY IF EXISTS "sessions_select_own" ON public.active_sessions;
CREATE POLICY "sessions_select_own" ON public.active_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_insert_own" ON public.active_sessions;
CREATE POLICY "sessions_insert_own" ON public.active_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_update_own" ON public.active_sessions;
CREATE POLICY "sessions_update_own" ON public.active_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_delete_own" ON public.active_sessions;
CREATE POLICY "sessions_delete_own" ON public.active_sessions FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- TRIGGER PARA ATUALIZAR AUTOMATICAMENTE updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_routines_updated_at ON public.routines;
CREATE TRIGGER trigger_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_settings_updated_at ON public.user_settings;
CREATE TRIGGER trigger_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
