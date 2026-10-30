import React, { useState, useEffect, useCallback } from 'react';
import {
  Dumbbell,
  Eye,
  EyeOff,
  UserPlus,
  KeyRound,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Cloud,
  Mail,
  Lock,
  User,
} from 'lucide-react';
import { AuthSession } from '../../types';
import { signIn, signUp, signOut, getCurrentUser } from '../../lib/neon';
import { saveActiveAuthSession } from '../../db/storage';
import { syncAllWithCloud } from '../../services/syncService';
import { RegisterModal } from './RegisterModal';
import { PinRecoveryModal } from './PinRecoveryModal';
import { CloudSyncLoginModal } from './CloudSyncLoginModal';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasShakeError, setHasShakeError] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true); // true = login, false = register

  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);

  // Check if user already logged in
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      const session: AuthSession = {
        userId: user.id,
        name: user.name,
        email: user.email,
        token: `neon_${Date.now()}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      saveActiveAuthSession(session);
      syncAllWithCloud();
      onLoginSuccess(session);
    }
  }, [onLoginSuccess]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      const status = getCurrentUser();
      if (status) {
        // Already logged in
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      setHasShakeError(false);

      try {
        let result;
        if (isLoginMode) {
          result = await signIn(email, password);
        } else {
          result = await signUp(email, password, email.split('@')[0]);
        }

        if (result.user) {
          const session: AuthSession = {
            userId: result.user.id,
            name: result.user.name,
            email: result.user.email,
            token: `neon_${Date.now()}`,
            createdAt: Date.now(),
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          };
          await saveActiveAuthSession(session);
          syncAllWithCloud();
          onLoginSuccess(session);
        } else {
          setHasShakeError(true);
          setTimeout(() => setHasShakeError(false), 500);
          setErrorMessage(result.error || 'Erro na autenticação');
        }
      } catch (err) {
        console.error('Login error', err);
        setErrorMessage('Erro ao autenticar. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, isLoginMode, onLoginSuccess]
  );

  const handleDemoLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      // Create demo account if not exists, then login
      const result = await signIn('demo@hyperpulse.app', 'demo123456');
      if (!result.user) {
        // Try to create
        await signUp('demo@hyperpulse.app', 'demo123456', 'Atleta Pro');
        const loginResult = await signIn('demo@hyperpulse.app', 'demo123456');
        if (loginResult.user) {
          const session: AuthSession = {
            userId: loginResult.user.id,
            name: loginResult.user.name,
            email: loginResult.user.email,
            token: `neon_${Date.now()}`,
            createdAt: Date.now(),
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          };
          await saveActiveAuthSession(session);
          syncAllWithCloud();
          onLoginSuccess(session);
        }
      } else {
        const session: AuthSession = {
          userId: result.user.id,
          name: result.user.name,
          email: result.user.email,
          token: `neon_${Date.now()}`,
          createdAt: Date.now(),
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        };
        await saveActiveAuthSession(session);
        syncAllWithCloud();
        onLoginSuccess(session);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro no login demo');
    } finally {
      setIsLoading(false);
    }
  }, [onLoginSuccess]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-between p-4 sm:p-6 text-zinc-100 selection:bg-lime-400 selection:text-zinc-950">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top Bar / App Branding */}
      <header className="relative z-10 flex items-center justify-center pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 to-lime-500 text-zinc-950 font-black shadow-lg shadow-lime-950/30">
            <Dumbbell className="h-5 w-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-tight text-white">
                HYPER<span className="text-lime-400">PULSE</span>
              </span>
              <span className="text-xs font-mono font-bold text-zinc-500 uppercase px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800">
                NEON
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto">
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header Title & Subtitle */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {isLoginMode ? 'Bem-vindo de volta' : 'Criar sua conta'}
            </h1>
            <p className="text-sm text-zinc-400">
              {isLoginMode 
                ? 'Digite seu email e senha para acessar seus treinos' 
                : 'Cadastre-se para sincronizar seus dados na nuvem'}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              className={`flex items-center gap-2.5 rounded-2xl p-3.5 text-xs font-semibold ${
                hasShakeError
                  ? 'border border-red-500/30 bg-red-950/30 text-red-400 animate-shake'
                  : 'border border-amber-500/30 bg-amber-950/30 text-amber-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="seu@email.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border ${hasShakeError ? 'border-red-500/50' : 'border-zinc-800'} bg-zinc-950/80 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400/50 transition disabled:opacity-50`}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder={isLoginMode ? 'Sua senha' : 'Mínimo 6 caracteres'}
                  className={`w-full pl-10 pr-12 py-3 rounded-2xl border ${hasShakeError ? 'border-red-500/50' : 'border-zinc-800'} bg-zinc-950/80 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400/50 transition disabled:opacity-50`}
                  disabled={isLoading}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password || (password.length < 6 && !isLoginMode)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-500 py-3.5 text-sm font-black text-zinc-950 hover:from-lime-300 hover:to-lime-400 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-lime-950/30 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                  <span>{isLoginMode ? 'Entrando...' : 'Criando conta...'}</span>
                </>
              ) : (
                <>
                  {isLoginMode ? <User className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isLoginMode ? 'Entrar' : 'Cadastrar'}</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
            <span>{isLoginMode ? 'Não tem conta?' : 'Já tem conta?'}</span>
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setErrorMessage('');
                setEmail('');
                setPassword('');
              }}
              className="text-lime-400 hover:text-lime-300 font-semibold transition"
            >
              {isLoginMode ? 'Criar cadastro' : 'Entrar'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-900/90 px-3 text-zinc-500">Ou</span>
            </div>
          </div>

          {/* Cloud Sync Button */}
          <button
            type="button"
            onClick={() => setIsCloudSyncOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800/80 hover:border-zinc-700 py-3 text-sm font-semibold text-zinc-300 transition active:scale-[0.99]"
          >
            <Cloud className="w-4 h-4 text-lime-400" />
            <span>Sincronizar conta da nuvem (Outro aparelho)</span>
          </button>

          {/* Forgot Password */}
          <button
            type="button"
            onClick={() => setIsRecoveryOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition py-2"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Esqueci minha senha</span>
          </button>

          {/* Demo Quick Login */}
          <div className="pt-4 border-t border-zinc-800/80">
            <div className="rounded-2xl border border-lime-500/20 bg-lime-500/10 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-lime-400">
                <Sparkles className="w-4 h-4" />
                <span>Acesso rápido para testar</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Email: demo@hyperpulse.app | Senha: demo123456
              </p>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-3 py-2 text-xs font-black text-zinc-950 hover:bg-lime-300 transition shadow-sm disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Entrar com Conta Demo</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-zinc-500 py-2">
        <p>HyperPulse Neon &bull; PostgreSQL serverless com sincronização em nuvem</p>
      </footer>

      {/* Modals */}
      <RegisterModal
        isOpen={false}
        onClose={() => {}}
        onSuccess={(session) => {
          onLoginSuccess(session);
        }}
      />

      <CloudSyncLoginModal
        isOpen={isCloudSyncOpen}
        onClose={() => {
          setIsCloudSyncOpen(false);
        }}
        onSuccess={(session) => {
          setIsCloudSyncOpen(false);
          onLoginSuccess(session);
        }}
      />

      <PinRecoveryModal
        isOpen={isRecoveryOpen}
        onClose={() => setIsRecoveryOpen(false)}
        onSuccess={() => {
          setErrorMessage('');
          setEmail('');
          setPassword('');
        }}
      />
    </div>
  );
};