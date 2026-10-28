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
} from 'lucide-react';
import { AuthSession, UserAccount } from '../../types';
import { PinInput } from './PinInput';
import { RegisterModal } from './RegisterModal';
import { PinRecoveryModal } from './PinRecoveryModal';
import { CloudSyncLoginModal } from './CloudSyncLoginModal';
import { syncAllWithCloud } from '../../services/syncService';
import {
  verifyPinLogin,
  getUserAccounts,
  saveUserAccount,
  saveActiveAuthSession,
} from '../../db/storage';
import {
  getLockoutStatus,
  recordFailedAttempt,
  resetFailedAttempts,
  generateSalt,
  hashStringWithSalt,
} from '../../utils/security';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasShakeError, setHasShakeError] = useState(false);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);

  const [lockoutWait, setLockoutWait] = useState(0);
  const [hasExistingAccounts, setHasExistingAccounts] = useState(true);

  // Check accounts count on mount
  useEffect(() => {
    getUserAccounts().then((accounts) => {
      setHasExistingAccounts(accounts.length > 0);
    });
  }, []);

  // Check lockout on mount & tick countdown timer
  useEffect(() => {
    const status = getLockoutStatus();
    if (status.isLocked) {
      setLockoutWait(status.waitSecondsRemaining);
      setErrorMessage(status.warningMessage || 'Muitas tentativas. Aguarde.');
    }

    const interval = setInterval(() => {
      const current = getLockoutStatus();
      if (current.isLocked) {
        setLockoutWait(current.waitSecondsRemaining);
        setErrorMessage(current.warningMessage || 'Muitas tentativas. Aguarde.');
      } else {
        setLockoutWait(0);
        if (errorMessage.includes('Aguarde')) {
          setErrorMessage('');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [errorMessage]);

  const handlePinComplete = useCallback(
    async (completedPin: string) => {
      // Check lockout first
      const status = getLockoutStatus();
      if (status.isLocked) {
        setLockoutWait(status.waitSecondsRemaining);
        setErrorMessage(status.warningMessage || 'Aguarde o tempo de espera.');
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const result = await verifyPinLogin(completedPin);

        if (result.success && result.account) {
          resetFailedAttempts();
          const session: AuthSession = {
            userId: result.account.id,
            name: result.account.name,
            email: result.account.email,
            token: `token_${Date.now()}`,
            createdAt: Date.now(),
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          };
          await saveActiveAuthSession(session);
          syncAllWithCloud();
          onLoginSuccess(session);
        } else {
          // Record failed attempt
          const penalty = recordFailedAttempt();
          setHasShakeError(true);
          setTimeout(() => setHasShakeError(false), 500);

          setErrorMessage(
            penalty.warningMessage || result.error || 'Código incorreto. Tente novamente.'
          );
          if (penalty.isLocked) {
            setLockoutWait(penalty.waitSecondsRemaining);
          }
          // Clear digits for next try
          setPinDigits(['', '', '', '', '', '']);
        }
      } catch (err) {
        console.error('Login error', err);
        setErrorMessage('Erro ao autenticar. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    },
    [onLoginSuccess]
  );

  // Quick 1-click test account creator (convenient for instant testing)
  const handleCreateDemoAccount = async () => {
    setIsLoading(true);
    try {
      const pinSalt = generateSalt(16);
      const passwordSalt = generateSalt(16);
      const pinHash = await hashStringWithSalt('123456', pinSalt);
      const passwordHash = await hashStringWithSalt('treino123', passwordSalt);

      const demoAcc: UserAccount = {
        id: `demo_${Date.now()}`,
        name: 'Atleta Pro',
        email: 'atleta@hyperpulse.app',
        pinSalt,
        pinHash,
        passwordSalt,
        passwordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveUserAccount(demoAcc);
      setHasExistingAccounts(true);

      // Pre-fill pin 123456 and auto login
      setPinDigits(['1', '2', '3', '4', '5', '6']);
      setTimeout(() => {
        handlePinComplete('123456');
      }, 300);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = lockoutWait > 0;

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
                PRO
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
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-zinc-400">
              Digite seu código de acesso para continuar
            </p>
          </div>

          {/* Error / Lockout Alert */}
          {errorMessage && (
            <div
              className={`flex items-center gap-2.5 rounded-2xl p-3.5 text-xs font-semibold ${
                isLocked
                  ? 'border border-amber-500/30 bg-amber-950/30 text-amber-300'
                  : 'border border-red-500/30 bg-red-950/30 text-red-400'
              }`}
            >
              {isLocked ? (
                <Clock className="w-4 h-4 shrink-0 text-amber-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 6 Square Inputs */}
          <div>
            <PinInput
              value={pinDigits}
              onChange={(newDigits) => {
                setErrorMessage('');
                setPinDigits(newDigits);
              }}
              onComplete={handlePinComplete}
              showPin={showPin}
              disabled={isLoading || isLocked}
              hasError={hasShakeError}
              autoFocus={true}
            />

            {/* Toggle show/hide PIN and indicator */}
            <div className="flex items-center justify-between px-1 text-xs">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition py-1"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showPin ? 'Ocultar números' : 'Mostrar números'}</span>
              </button>

              {/* Loading spinner */}
              {isLoading && (
                <div className="flex items-center gap-2 text-lime-400 font-semibold animate-pulse">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
                  <span>Validando...</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button: Criar Cadastro */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800/80 hover:border-zinc-700 py-3.5 text-sm font-bold text-white transition active:scale-[0.99] shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-lime-400" />
              <span>Criar cadastro</span>
            </button>

            {/* "Esqueci meu código" & "Sincronizar outro aparelho" */}
            <div className="flex flex-col items-center gap-2 pt-1 text-center">
              <button
                type="button"
                onClick={() => setIsCloudSyncOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-lime-400 hover:text-lime-300 transition"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Sincronizar conta da nuvem (Outro aparelho)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRecoveryOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Esqueci meu código de acesso</span>
              </button>
            </div>
          </div>

          {/* Friendly First-Time Setup helper if device has no accounts yet */}
          {!hasExistingAccounts && (
            <div className="mt-4 pt-4 border-t border-zinc-800/80">
              <div className="rounded-2xl border border-lime-500/20 bg-lime-500/10 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-lime-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Primeiro acesso neste aparelho?</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Crie sua conta para proteger seus treinos e cargas com seu código numérico pessoal, ou experimente com 1 clique:
                </p>
                <button
                  type="button"
                  onClick={handleCreateDemoAccount}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-3 py-2 text-xs font-black text-zinc-950 hover:bg-lime-300 transition shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Entrar com Código Rápido (123456)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-zinc-500 py-2">
        <p>HyperPulse Pro &bull; Segurança biométrica e sincronização em nuvem Supabase</p>
      </footer>

      {/* Modals */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => {
          setIsRegisterOpen(false);
          getUserAccounts().then((accs) => setHasExistingAccounts(accs.length > 0));
        }}
        onSuccess={(session) => {
          setIsRegisterOpen(false);
          onLoginSuccess(session);
        }}
      />

      <CloudSyncLoginModal
        isOpen={isCloudSyncOpen}
        onClose={() => {
          setIsCloudSyncOpen(false);
          getUserAccounts().then((accs) => setHasExistingAccounts(accs.length > 0));
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
          setPinDigits(['', '', '', '', '', '']);
        }}
      />
    </div>
  );
};
