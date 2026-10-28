import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getUserAccountByEmail, updateUserAccountPin } from '../../db/storage';
import { verifyValue, generateSalt, hashStringWithSalt } from '../../utils/security';

interface PinRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const PinRecoveryModal: React.FC<PinRecoveryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'verify' | 'new_pin'>('verify');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const account = await getUserAccountByEmail(trimmedEmail);

      if (!account) {
        setErrorMessage('Nenhuma conta encontrada com este e-mail.');
        setIsLoading(false);
        return;
      }

      const isValidPassword = await verifyValue(password, account.passwordSalt, account.passwordHash);
      if (!isValidPassword) {
        setErrorMessage('Senha incorreta. Verifique suas credenciais.');
        setIsLoading(false);
        return;
      }

      // Password matches, advance to step 2: choose new 6-digit PIN
      setStep('new_pin');
    } catch (err) {
      console.error('Recovery verification error', err);
      setErrorMessage('Erro ao verificar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!/^\d{6}$/.test(newPin)) {
      setErrorMessage('O novo código deve conter exatamente 6 dígitos numéricos (0-9).');
      return;
    }

    if (newPin !== confirmNewPin) {
      setErrorMessage('Os novos códigos digitados não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const newPinSalt = generateSalt(16);
      const newPinHash = await hashStringWithSalt(newPin, newPinSalt);

      const updated = await updateUserAccountPin(trimmedEmail, newPinHash, newPinSalt);
      if (!updated) {
        setErrorMessage('Falha ao atualizar o código no banco de dados.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Código de acesso atualizado com sucesso!');
      setTimeout(() => {
        onSuccess(trimmedEmail);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Reset PIN error', err);
      setErrorMessage('Erro ao redefinir código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl">
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
            <KeyRound className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Recuperar Código</h2>
            <p className="text-xs text-zinc-400">
              {step === 'verify' ? 'Valide seu e-mail e senha cadastrados' : 'Defina seu novo código de 6 dígitos'}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-lime-500/30 bg-lime-950/30 p-3.5 text-xs text-lime-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {step === 'verify' ? (
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                E-mail Cadastrado
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
                  Sua Senha Mestra
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
                placeholder="Digite sua senha cadastrada"
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
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Validar & Continuar</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPin} className="space-y-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Novo Código de 6 Dígitos
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showNewPin ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Novo Código (6 números)
                </label>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Ex: 654321"
                  className="w-full tracking-widest text-center text-lg font-mono font-bold rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-white focus:border-lime-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Confirmar Novo Código
                </label>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Ex: 654321"
                  className="w-full tracking-widest text-center text-lg font-mono font-bold rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-white focus:border-lime-400 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-lime-400 py-3 text-sm font-extrabold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Novo Código</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
