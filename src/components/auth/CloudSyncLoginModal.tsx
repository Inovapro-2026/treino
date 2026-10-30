import React, { useState } from 'react';
import { X, Cloud, Eye, EyeOff, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { AuthSession } from '../../types';
import { signIn } from '../../lib/neon';
import { saveActiveAuthSession } from '../../db/storage';
import { syncAllWithCloud } from '../../services/syncService';

interface CloudSyncLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
}

export const CloudSyncLoginModal: React.FC<CloudSyncLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleCloudSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      // 1. Authenticate with Neon
      const result = await signIn(trimmedEmail, password);

      if (!result.user) {
        throw new Error(result.error || 'E-mail ou senha incorretos.');
      }

      const user = result.user;
      setStatusMessage('Autenticado com sucesso no Neon. Baixando dados...');

      // 2. Download data from Neon
      await syncAllWithCloud();

      // 3. Establish active session
      const session: AuthSession = {
        userId: user.id,
        name: user.name,
        email: user.email,
        token: `neon_${Date.now()}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      await saveActiveAuthSession(session);
      onSuccess(session);
      onClose();
    } catch (err: any) {
      console.error('Cloud sign in failed', err);
      setErrorMessage(err?.message || 'Falha ao sincronizar com o Neon Cloud.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400">
            <Cloud className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Sincronizar Dispositivo</h2>
            <p className="text-xs text-zinc-400">Recupere seus treinos e perfil cadastrados na nuvem Neon</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && !errorMessage && (
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-lime-500/30 bg-lime-950/30 p-3.5 text-xs text-lime-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 animate-pulse" />
            <span>{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleCloudSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              E-mail da sua Conta Neon
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Senha
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha da nuvem"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-lime-400 py-3 text-sm font-extrabold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                Sincronizando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Baixar Dados & Conectar
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};