import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface PhaseTimerProps {
  endsAt: number; // Unix ms
  onTimerExpired?: () => void;
  label?: string;
}

export const PhaseTimer: React.FC<PhaseTimerProps> = ({ endsAt, onTimerExpired, label }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && onTimerExpired) {
        onTimerExpired();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onTimerExpired]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft <= 15;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-900 border border-slate-700/80 rounded-lg shadow-inner">
      <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
      {label && <span className="text-xs text-slate-400 font-mono hidden sm:inline">{label}:</span>}
      <span className={`font-mono text-sm font-bold tracking-wider ${
        isUrgent ? 'text-red-500 text-glow-red animate-pulse' : 'text-slate-100'
      }`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};
