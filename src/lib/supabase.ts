/**
 * Supabase Client Configuration for HyperPulse Treino
 * Only uses public environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
 * The service role secret key is strictly prohibited in frontend bundles.
 */
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hhokoredbiznitmztizy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'hp_supabase_auth_token',
  },
  db: {
    schema: 'public',
  },
});

export interface SupabaseConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean;
  hasTables: boolean;
  currentUser: User | null;
  errorMessage?: string;
}

/**
 * Check if the Supabase project is properly configured and reachable
 */
export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      isConfigured: false,
      isConnected: false,
      hasTables: false,
      currentUser: null,
      errorMessage: 'Credenciais do Supabase não configuradas.',
    };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check table accessibility
    const { error: tableError } = await supabase.from('routines').select('count', { count: 'exact', head: true });

    const hasTables = !tableError || !tableError.message.includes('Could not find the table');

    return {
      isConfigured: true,
      isConnected: true,
      hasTables,
      currentUser: user || null,
      errorMessage: tableError && !hasTables ? 'Tabelas aguardando execução do script de migration SQL no Supabase.' : undefined,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      hasTables: false,
      currentUser: null,
      errorMessage: err?.message || 'Falha ao conectar com o Supabase.',
    };
  }
}
