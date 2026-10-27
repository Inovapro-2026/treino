import React, { useState } from 'react';
import {
  User,
  Clock,
  Smartphone,
  Cloud,
  Download,
  Upload,
  Trash2,
  Check,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import { UserSettings } from '../../types';
import {
  exportAllData,
  exportLogsCSV,
  importData,
  clearAllData,
} from '../../db/storage';
import { playCompleteChime, triggerHaptic } from '../../utils/audio';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface SettingsViewProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onDataReload: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onDataReload,
}) => {
  const [userName, setUserName] = useState(settings.userName || '');
  const [motivationalMessage, setMotivationalMessage] = useState(
    settings.motivationalMessage || ''
  );
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [vibrationEnabled, setVibrationEnabled] = useState(settings.vibrationEnabled);
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(settings.defaultRestSeconds || 90);
  const [autoStartRest, setAutoStartRest] = useState(settings.autoStartRest);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(settings.weightUnit || 'kg');
  const [weeklyGoal, setWeeklyGoal] = useState(settings.weeklyWorkoutGoal || 5);

  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || '');

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const handleSave = () => {
    const updated: UserSettings = {
      ...settings,
      userName: userName.trim() || 'Atleta',
      motivationalMessage: motivationalMessage.trim(),
      soundEnabled,
      vibrationEnabled,
      defaultRestSeconds,
      autoStartRest,
      weightUnit,
      weeklyWorkoutGoal: weeklyGoal,
      supabaseUrl: supabaseUrl.trim() || undefined,
      supabaseAnonKey: supabaseAnonKey.trim() || undefined,
      syncStatus: supabaseUrl.trim() ? 'synced' : 'local',
    };
    onSaveSettings(updated);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleTestSound = () => {
    playCompleteChime();
  };

  const handleTestVibration = () => {
    triggerHaptic([100, 50, 100]);
  };

  const handleExportJSON = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hyperpulse_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    const csvStr = await exportLogsCSV();
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hyperpulse_treinos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = await importData(content);
        if (success) {
          alert('Backup restaurado com sucesso!');
          onDataReload();
        } else {
          alert('Erro ao importar arquivo. Verifique se o formato está correto.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = async () => {
    await clearAllData();
    setShowClearConfirm(false);
    onDataReload();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Configurações</h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Personalize seu perfil, cronômetro, áudios, backups e sincronização.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-xl bg-lime-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-lime-300 transition active:scale-95 shadow-sm shadow-lime-950/20"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>Salvar Ajustes</span>
        </button>
      </div>

      {saveToast && (
        <div className="rounded-xl border border-lime-500/30 bg-lime-500/10 p-3 text-xs font-bold text-lime-400 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Configurações atualizadas com sucesso!</span>
        </div>
      )}

      {/* Profile */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-lime-400" />
          Perfil do Atleta
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Nome ou Apelido
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Ex: Atleta"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Meta Semanal de Treinos
            </label>
            <select
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(parseInt(e.target.value, 10))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:outline-hidden"
            >
              {[3, 4, 5, 6, 7].map((num) => (
                <option key={num} value={num}>
                  {num} treinos por semana
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
            Mensagem Motivacional no Dashboard
          </label>
          <input
            type="text"
            value={motivationalMessage}
            onChange={(e) => setMotivationalMessage(e.target.value)}
            placeholder="Ex: Constância vence o talento."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Workout & Rest Timer Preferences */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-lime-400" />
          Cronômetro e Preferências de Treino
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Tempo Padrão de Descanso
            </label>
            <select
              value={defaultRestSeconds}
              onChange={(e) => setDefaultRestSeconds(parseInt(e.target.value, 10))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:outline-hidden"
            >
              <option value={45}>45 segundos (séries leves / pump)</option>
              <option value={60}>60 segundos (isoladores)</option>
              <option value={90}>90 segundos (hipertrofia padrão)</option>
              <option value={120}>120 segundos (compostos / multiarticulares)</option>
              <option value={180}>180 segundos (força máxima / agachamento)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Unidade de Peso
            </label>
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lbs')}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:outline-hidden"
            >
              <option value="kg">Quilogramas (kg)</option>
              <option value="lbs">Libras (lbs)</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5 cursor-pointer">
            <div>
              <span className="font-bold text-sm text-white block">
                Iniciar Descanso Automaticamente
              </span>
              <span className="text-xs text-zinc-400">
                Ao marcar uma série como concluída, o cronômetro começa imediatamente.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoStartRest}
              onChange={(e) => setAutoStartRest(e.target.checked)}
              className="h-5 w-5 rounded accent-lime-400"
            />
          </label>

          <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5">
            <div>
              <span className="font-bold text-sm text-white block">Efeitos Sonoros do Cronômetro</span>
              <span className="text-xs text-zinc-400">
                Bips nos últimos 3 segundos e acorde no fim do descanso.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestSound}
                className="text-xs text-lime-400 hover:underline font-semibold"
              >
                Testar Som
              </button>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="h-5 w-5 rounded accent-lime-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5">
            <div>
              <span className="font-bold text-sm text-white block">Vibração Háptica no Celular</span>
              <span className="text-xs text-zinc-400">
                Vibra ao concluir séries e quando o descanso termina.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestVibration}
                className="text-xs text-lime-400 hover:underline font-semibold"
              >
                Testar Vibração
              </button>
              <input
                type="checkbox"
                checked={vibrationEnabled}
                onChange={(e) => setVibrationEnabled(e.target.checked)}
                className="h-5 w-5 rounded accent-lime-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* PWA & Installation */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-lime-400" />
          Aplicativo Instalável (PWA)
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          O HyperPulse é um Progressive Web App. Você pode instalá-lo diretamente na tela inicial do seu celular (Android ou iOS) para usar em tela cheia, sem barra do navegador, com carregamento instantâneo e funcionamento 100% offline dentro da academia.
        </p>
        <div className="pt-1">
          <PWAInstallButton />
        </div>
      </div>

      {/* Cloud Sync (Supabase) */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-lime-400" />
              Sincronização em Nuvem (Supabase)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Por padrão, o aplicativo funciona de forma autônoma e offline via IndexedDB. Você pode conectar seu projeto Supabase para backup contínuo.
            </p>
          </div>

          <span
            className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
              supabaseUrl ? 'bg-lime-400/20 text-lime-400' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {supabaseUrl ? 'Nuvem Conectada' : 'Modo Local (Offline)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              URL do Projeto Supabase
            </label>
            <input
              type="url"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-lime-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Chave Anônima (Anon Key)
            </label>
            <input
              type="password"
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-lime-400 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Backup, Export & Danger Zone */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-lime-400" />
          Backup, Exportação e Importação de Dados
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs font-bold text-zinc-200 hover:border-lime-400 transition"
          >
            <FileCode className="w-4 h-4 text-lime-400" />
            <span>Exportar Backup (JSON)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs font-bold text-zinc-200 hover:border-lime-400 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-lime-400" />
            <span>Exportar Histórico (CSV)</span>
          </button>

          <label className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs font-bold text-zinc-200 hover:border-lime-400 transition cursor-pointer">
            <Upload className="w-4 h-4 text-lime-400" />
            <span>Importar Backup (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">
              Redefinir Dados
            </span>
            <span className="text-xs text-zinc-500">
              Apaga todos os treinos, medições e restaura a divisão original de fábrica.
            </span>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Banco</span>
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showClearConfirm}
        title="Redefinir e Limpar Todos os Dados?"
        description="Esta ação apagará permanentemente suas fichas modificadas, sessões concluídas no histórico e medidas corporais salvas. Tem certeza absoluta?"
        confirmLabel="Sim, Apagar Tudo"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
