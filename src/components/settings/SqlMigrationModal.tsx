import React, { useState } from 'react';
import { X, Copy, Check, FileCode, ExternalLink, ShieldCheck } from 'lucide-react';

interface SqlMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SQL_MIGRATION_SCRIPT = `-- ==============================================================================
-- HyperPulse Treino — Neon PostgreSQL Schema & Migrations
-- Arquitetura para PostgreSQL serverless (compatível com Neon, Supabase, etc.)
-- ==============================================================================

-- 1. PROFILES (Perfis de usuários)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

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

DROP TRIGGER IF EXISTS trigger_exercises_updated_at ON public.exercises;
CREATE TRIGGER trigger_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_workout_logs_updated_at ON public.workout_logs;
CREATE TRIGGER trigger_workout_logs_updated_at
  BEFORE UPDATE ON public.workout_logs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_body_measurements_updated_at ON public.body_measurements;
CREATE TRIGGER trigger_body_measurements_updated_at
  BEFORE UPDATE ON public.body_measurements
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_active_sessions_updated_at ON public.active_sessions;
CREATE TRIGGER trigger_active_sessions_updated_at
  BEFORE UPDATE ON public.active_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==============================================================================
-- NOTAS DE USO:
-- ==============================================================================
-- 1. Execute este script no Neon Console (https://console.neon.tech) > SQL Editor
-- 2. Ou use: psql "postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require" -f migration.sql
-- 3. O app usa autenticação própria (email/senha com PIN) - não depende de Supabase Auth
-- 4. A segurança de acesso aos dados é feita no nível da aplicação (middleware/API)
-- ==============================================================================
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
            <h2 className="text-lg font-extrabold text-white">Script de Migração SQL — Neon PostgreSQL</h2>
            <p className="text-xs text-zinc-400">
              Cole este script no <strong>SQL Editor</strong> do <a href="https://console.neon.tech" target="_blank" rel="noreferrer" className="text-lime-400 hover:underline">Neon Console</a> para criar as tabelas.
            </p>
          </div>
        </div>

        <div className="relative my-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 max-h-80 overflow-y-auto">
          <pre className="whitespace-pre-wrap">{SQL_MIGRATION_SCRIPT}</pre>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-lime-400 shrink-0" />
            <span>Triggers de updated_at automáticos inclusos</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="https://console.neon.tech"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition flex-1 sm:flex-none"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Neon Console</span>
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