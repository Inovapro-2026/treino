import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-lime-400 font-semibold text-zinc-950 transition hover:bg-lime-300 active:scale-95 shadow-sm shadow-lime-950/20 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        }`}
        title="Instalar HyperPulse no seu dispositivo"
      >
        <Download className="w-4 h-4" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 font-medium text-zinc-200 transition hover:bg-zinc-700 ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-lime-400" />
          <span>Instalar no iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl text-zinc-100">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-lime-400/20 text-lime-400 flex items-center justify-center font-bold text-sm">
                    HP
                  </div>
                  <h3 className="font-semibold text-base">Instalar no iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-sm text-zinc-300">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lime-400 font-bold">
                    1
                  </div>
                  <div>
                    No Safari, toque no botão de <strong className="text-white">Compartilhar</strong>{' '}
                    <Share className="inline-block w-4 h-4 text-lime-400 mx-1" /> na barra inferior.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lime-400 font-bold">
                    2
                  </div>
                  <div>
                    Role a lista e toque em <strong className="text-white">Adicionar à Tela de Início</strong>{' '}
                    <PlusSquare className="inline-block w-4 h-4 text-lime-400 mx-1" />.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lime-400 font-bold">
                    3
                  </div>
                  <div>
                    Abra o ícone <strong className="text-white">HyperPulse</strong> diretamente na sua tela inicial para usar em tela cheia e offline na academia!
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-lime-400 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
