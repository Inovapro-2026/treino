import React, { useState } from 'react';
import { X, Copy, Check, FileCode, ExternalLink, ShieldCheck } from 'lucide-react';

interface SqlMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SQL_MIGRATION_SCRIPT = `-- ==============================================================================
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
  day_of_week integer NOT NULL,
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

-- 7. ACTIVE SESSIONS (Sessão de treino em andamento)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_routines_user_day ON public.routines(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON public.workout_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON public.body_measurements(user_id, date DESC);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS
CREATE POLICY "profiles_manage_own" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "settings_manage_own" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "routines_manage_own" ON public.routines FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exercises_manage_own" ON public.exercises FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "logs_manage_own" ON public.workout_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "measurements_manage_own" ON public.body_measurements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_manage_own" ON public.active_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
`;

export const SqlMigrationModal: React.FC<SqlMigrationModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl my-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400">
            <FileCode className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Script de Migração SQL — Supabase</h2>
            <p className="text-xs text-zinc-400">
              Cole este script no <strong>SQL Editor</strong> do painel do seu projeto Supabase para criar as tabelas com RLS.
            </p>
          </div>
        </div>

        <div className="relative my-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 max-h-80 overflow-y-auto">
          <pre className="whitespace-pre-wrap">{SQL_MIGRATION_SCRIPT}</pre>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-lime-400 shrink-0" />
            <span>Row Level Security (RLS) habilitada em todas as tabelas</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="https://supabase.com/dashboard/project/hhokoredbiznitmztizy/sql"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition flex-1 sm:flex-none"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir SQL Editor</span>
            </a>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-lime-400 px-4 py-2.5 text-xs font-black text-zinc-950 hover:bg-lime-300 transition flex-1 sm:flex-none shadow-md shadow-lime-950/20"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
