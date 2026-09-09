import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, ShieldAlert, Fingerprint, Delete } from 'lucide-react';

export const PinModal: React.FC = () => {
  const { isLocked, unlockApp, currentUser, t } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) {
        verifyPin(next);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const verifyPin = (code: string) => {
    const success = unlockApp(code);
    if (success) {
      setPin('');
      setError(false);
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl">
        
        {/* Lock Icon & Title */}
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-lg font-bold text-white mb-1">
          قفل أمان الورش — Ochanti
        </h2>
        <p className="text-xs text-zinc-400 mb-6">
          أهلاً {currentUser.name}. أدخل الرمز السري المكون من 4 أرقام لفتح التطبيق.
        </p>

        {/* Pin Dots Display */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border transition-all ${
                error
                  ? 'border-red-500 bg-red-500 animate-pulse'
                  : pin.length > index
                    ? 'border-amber-400 bg-amber-400 scale-110'
                    : 'border-zinc-700 bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 mb-4">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{t.incorrectPin} (الافتراضي: 1234)</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className="h-14 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 active:bg-amber-500 active:text-zinc-950 text-xl font-bold text-zinc-100 transition-colors border border-zinc-700/50 flex items-center justify-center font-mono"
            >
              {d}
            </button>
          ))}

          {/* Bottom Row */}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 transition-colors border border-zinc-700/30 flex items-center justify-center"
          >
            مسح
          </button>
          
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 active:bg-amber-500 active:text-zinc-950 text-xl font-bold text-zinc-100 transition-colors border border-zinc-700/50 flex items-center justify-center font-mono"
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700/30 flex items-center justify-center"
          >
            <Delete className="w-5 h-5 rtl:rotate-180" />
          </button>
        </div>

        {/* Quick biometric simulation */}
        <button
          onClick={() => verifyPin('1234')}
          className="w-full py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-2 border border-zinc-700/50 transition-colors"
        >
          <Fingerprint className="w-4 h-4 text-amber-400" />
          <span>فتح سريع ببصمة الإصبع / الرمز الافتراضي</span>
        </button>

      </div>
    </div>
  );
};
