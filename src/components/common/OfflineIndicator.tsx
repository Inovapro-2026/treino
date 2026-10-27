import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC<{ pendingSyncCount?: number }> = ({ pendingSyncCount = 0 }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-40 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/95 px-3 py-2 text-xs font-medium text-zinc-200 shadow-xl backdrop-blur-md transition-all">
      {!isOnline ? (
        <>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>Modo Offline — Dados 100% salvos localmente</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 text-lime-400" />
          <span>Sincronizando {pendingSyncCount} alteração{pendingSyncCount > 1 ? 'ões' : ''}...</span>
        </>
      )}
    </div>
  );
};
