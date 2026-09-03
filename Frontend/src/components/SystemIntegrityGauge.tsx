import React from 'react';
import { SystemIntegrity } from '../types/game';
import { Activity, AlertOctagon, CheckCircle2, ShieldAlert, Cpu, HardDrive } from 'lucide-react';

interface SystemIntegrityGaugeProps {
  integrity: SystemIntegrity;
  isMemoryLeakActive?: boolean;
}

export const SystemIntegrityGauge: React.FC<SystemIntegrityGaugeProps> = ({
  integrity,
  isMemoryLeakActive = false
}) => {
  const score = integrity.score;
  const isBroken = integrity.pipelineStatus === 'PIPELINE_BROKEN' || score < 50;

  return (
    <div className="bg-dark-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs select-none shadow-xl">
      {/* Gauge & Title */}
      <div className="flex items-center space-x-4">
        <div className="relative w-14 h-14 flex items-center justify-center">
          {/* Circular Progress SVG */}
          <svg className="w-14 h-14 transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="22"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-800"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r="22"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={138}
              strokeDashoffset={138 - (138 * score) / 100}
              strokeLinecap="round"
              className={`transition-all duration-500 ${
                score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-500 animate-pulse'
              }`}
              fill="transparent"
            />
          </svg>

          <span className={`absolute font-extrabold text-sm ${
            score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-500'
          }`}>
            {score}%
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-cyan-400" /> SYSTEM INTEGRITY HEALTH
          </span>
          <h2 className="text-base font-extrabold text-slate-100 font-mono tracking-tight mt-0.5">
            Pipeline Health: {score}%
          </h2>
          <span className="text-[10px] text-slate-500 block">
            Build Latency: {integrity.buildDurationMs}ms • Updated {integrity.lastUpdated}
          </span>
        </div>
      </div>

      {/* Pipeline Status Badge & Memory Leak Warning */}
      <div className="flex items-center space-x-3">
        {isMemoryLeakActive && (
          <div className="px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-300 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
            <HardDrive className="w-3.5 h-3.5 text-red-400" />
            <span>MEMORY LEAK DETECTED</span>
          </div>
        )}

        <div className={`px-4 py-2 rounded-xl border text-xs font-bold font-mono flex items-center gap-2 ${
          isBroken
            ? 'bg-red-950/90 border-red-500 text-red-400 shadow-lg shadow-red-950/50 animate-pulse'
            : score >= 80
            ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400 shadow-md'
            : 'bg-amber-950/80 border-amber-500/60 text-amber-400'
        }`}>
          {isBroken ? (
            <>
              <AlertOctagon className="w-4 h-4 text-red-500" />
              <span>PIPELINE BROKEN</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>STATUS: {integrity.pipelineStatus}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
