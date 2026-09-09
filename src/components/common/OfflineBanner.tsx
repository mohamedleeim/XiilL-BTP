import React from 'react';
import { useApp } from '../../context/AppContext';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOnline, syncPendingCount, triggerSync, t } = useApp();
  const [syncing, setSyncing] = React.useState(false);

  if (isOnline && syncPendingCount === 0) return null;

  const handleSync = async () => {
    setSyncing(true);
    await triggerSync();
    setSyncing(false);
  };

  return (
    <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
      !isOnline 
        ? 'bg-amber-950/80 border-amber-800 text-amber-200' 
        : 'bg-zinc-900 border-zinc-800 text-zinc-300'
    }`}>
      <div className="flex items-center gap-2 max-w-[75%] truncate">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">{t.offline}</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>يوجد {syncPendingCount} عملية محلية غير متزامنة مع السحابة</span>
          </>
        )}
      </div>

      {isOnline && syncPendingCount > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 text-xs transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>مزامنة فورية</span>
        </button>
      )}
    </div>
  );
};
