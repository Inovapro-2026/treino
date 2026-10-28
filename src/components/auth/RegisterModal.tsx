import React, { useState } from 'react';
import { X, UserPlus, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserAccount, AuthSession } from '../../types';
import { getUserAccountByEmail, saveUserAccount, saveActiveAuthSession } from '../../db/storage';
import { generateSalt, hashStringWithSalt } from '../../utils/security';
import { supabase } from '../../lib/supabase';
import { syncAllWithCloud } from '../../services/syncService';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha mestra deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      setErrorMessage('O código numérico de acesso deve conter exatamente 6 dígitos numéricos (0-9).');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMessage('A confirmação do código de 6 dígitos não coincide.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Você deve concordar com os termos de uso para prosseguir.');
      return;
    }

    setIsLoading(true);

    try {
      // Check duplicate email
      const existing = await getUserAccountByEmail(trimmedEmail);
      if (existing) {
        setErrorMessage('Já existe uma conta cadastrada com este e-mail. Utilize a recuperação de código ou faça login.');
        setIsLoading(false);
        return;
      }

      // Generate cryptographic salts and hashes
      const pinSalt = generateSalt(16);
      const passwordSalt = generateSalt(16);

      const [pinHash, passwordHash] = await Promise.all([
        hashStringWithSalt(pin, pinSalt),
        hashStringWithSalt(password, passwordSalt),
      ]);

      const now = new Date().toISOString();
      const newAccount: UserAccount = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: trimmedName,
        email: trimmedEmail,
        pinSalt,
        pinHash,
        passwordSalt,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      };

      // Attempt Supabase Auth registration
      try {
        const { data: authData } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
          options: {
            data: {
              name: trimmedName,
              pin_salt: pinSalt,
              pin_hash: pinHash,
            },
          },
        });

        if (authData?.user) {
          newAccount.id = authData.user.id;
          // Attempt upserting profile in Supabase table
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: trimmedEmail,
            name: trimmedName,
            pin_salt: pinSalt,
            pin_hash: pinHash,
            updated_at: now,
          });
        }
      } catch (cloudErr) {
        console.warn('Cloud registration sync notice:', cloudErr);
      }

      await saveUserAccount(newAccount);

      // Create active session
      const session: AuthSession = {
        userId: newAccount.id,
        name: newAccount.name,
        email: newAccount.email,
        token: `session_${Date.now()}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      await saveActiveAuthSession(session);
      
      // Trigger background sync with cloud
      syncAllWithCloud();

      onSuccess(session);
      onClose();
    } catch (err) {
      console.error('Registration failed', err);
      setErrorMessage('Falha ao criar cadastro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400">
            <UserPlus className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Criar Nova Conta</h2>
            <p className="text-xs text-zinc-400">Cadastre seu código numérico de 6 dígitos para acesso rápido</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Silva"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-lime-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-lime-400 focus:outline-hidden"
            />
          </div>

          {/* Master Password for recovery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-lime-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Confirmar Senha
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-lime-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 6-Digit PIN fields */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Código de Acesso (6 Dígitos)
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPin ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Este código de 6 números será utilizado para desbloquear seu aplicativo na academia de forma rápida.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Código (6 números)
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Ex: 123456"
                  className="w-full tracking-widest text-center text-lg font-mono font-bold rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-white focus:border-lime-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Confirmar Código
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Ex: 123456"
                  className="w-full tracking-widest text-center text-lg font-mono font-bold rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-white focus:border-lime-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Terms Agreement Checkbox */}
          <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded accent-lime-400 bg-zinc-950 border-zinc-800"
            />
            <span className="text-xs text-zinc-400 leading-snug">
              Li e concordo com os termos de uso, armazenamento local seguro e privacidade dos meus treinos.
            </span>
          </label>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-lime-400 py-3 text-sm font-extrabold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-lime-950/20 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Concluir Cadastro & Entrar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
