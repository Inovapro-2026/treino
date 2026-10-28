import React, { useState } from 'react';
import { X, Cloud, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthSession, UserAccount } from '../../types';
import { supabase } from '../../lib/supabase';
import { saveUserAccount, saveActiveAuthSession } from '../../db/storage';
import { syncAllWithCloud } from '../../services/syncService';
import { generateSalt, hashStringWithSalt } from '../../utils/security';

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

  // Fallback PIN setup if the account doesn't have a 6-digit PIN registered in profile
  const [requiresPinSetup, setRequiresPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleCloudSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'E-mail ou senha incorretos.');
      }

      const user = authData.user;
      setStatusMessage('Autenticado com sucesso no Supabase. Buscando perfil...');

      // 2. Fetch profile from Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      let pinSalt = profile?.pin_salt || user.user_metadata?.pin_salt;
      let pinHash = profile?.pin_hash || user.user_metadata?.pin_hash;
      const userName = profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Atleta';

      if (!pinSalt || !pinHash) {
        // Needs to set 6-digit PIN on this device
        setRequiresPinSetup(true);
        setIsLoading(false);
        return;
      }

      // 3. Save account locally in IndexedDB
      const passwordSalt = generateSalt(16);
      const passwordHash = await hashStringWithSalt(password, passwordSalt);

      const account: UserAccount = {
        id: user.id,
        name: userName,
        email: trimmedEmail,
        pinSalt,
        pinHash,
        passwordSalt,
        passwordHash,
        createdAt: user.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveUserAccount(account);

      // 4. Download routines, logs, measurements from Supabase
      setStatusMessage('Sincronizando treinos e histórico...');
      await syncAllWithCloud();

      // 5. Establish active session
      const session: AuthSession = {
        userId: user.id,
        name: userName,
        email: trimmedEmail,
        token: authData.session?.access_token || `session_${Date.now()}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      await saveActiveAuthSession(session);
      onSuccess(session);
      onClose();
    } catch (err: any) {
      console.error('Cloud sign in failed', err);
      setErrorMessage(err?.message || 'Falha ao sincronizar com a nuvem Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPinAndFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(newPin)) {
      setErrorMessage('O código numérico deve conter exatamente 6 dígitos.');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMessage('Os códigos digitados não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Sessão expirada. Faça login novamente.');

      const pinSalt = generateSalt(16);
      const pinHash = await hashStringWithSalt(newPin, pinSalt);
      const passwordSalt = generateSalt(16);
      const passwordHash = await hashStringWithSalt(password, passwordSalt);
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Atleta';

      // Update in Supabase profile
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        name: userName,
        pin_salt: pinSalt,
        pin_hash: pinHash,
        updated_at: new Date().toISOString(),
      });

      const account: UserAccount = {
        id: user.id,
        name: userName,
        email: user.email || '',
        pinSalt,
        pinHash,
        passwordSalt,
        passwordHash,
        createdAt: user.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveUserAccount(account);
      await syncAllWithCloud();

      const session: AuthSession = {
        userId: user.id,
        name: userName,
        email: user.email || '',
        token: `token_${Date.now()}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      await saveActiveAuthSession(session);
      onSuccess(session);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao definir código.');
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
            <p className="text-xs text-zinc-400">Recupere seus treinos e perfil cadastrados na nuvem</p>
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

        {!requiresPinSetup ? (
          <form onSubmit={handleCloudSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                E-mail da sua Conta
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
                  Senha Mestra
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
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <span>Baixar Dados & Conectar</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSetPinAndFinish} className="space-y-4">
            <p className="text-xs text-zinc-300">
              Conta encontrada na nuvem! Defina um código numérico de 6 dígitos para desbloquear este aparelho:
            </p>

            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                Novo Código de 6 Dígitos
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Ex: 123456"
                className="w-full tracking-widest text-center text-lg font-mono font-bold rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-white focus:border-lime-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                Confirmar Código
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Ex: 123456"
                className="w-full tracking-widest text-center text-lg font-mono font-bold rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-white focus:border-lime-400 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-lime-400 py-3 text-sm font-extrabold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
              ) : (
                <span>Salvar Código & Abrir App</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
