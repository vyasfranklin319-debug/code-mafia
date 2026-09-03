import React from 'react';
import { PrHotfix, Player, SabotageState } from '../types/game';
import { GitPullRequest, Zap, HardDrive, RotateCcw, EyeOff, Plus, CheckCircle, AlertTriangle, Layers } from 'lucide-react';

interface PrHotfixPanelProps {
  stagedPrs: PrHotfix[];
  currentUser: Player;
  players: Player[];
  sabotageState: SabotageState;
  onStagePr: () => void;
  onActivateMemoryLeak: () => void;
  onActivateSilentRegression: () => void;
  onActivateSyntaxMasking: (targetPlayer: Player) => void;
}

export const PrHotfixPanel: React.FC<PrHotfixPanelProps> = ({
  stagedPrs,
  currentUser,
  players,
  sabotageState,
  onStagePr,
  onActivateMemoryLeak,
  onActivateSilentRegression,
  onActivateSyntaxMasking
}) => {
  const isMafia = currentUser.role === 'MAFIA';
  const otherPlayers = players.filter(p => p.id !== currentUser.id && p.isAlive);

  return (
    <div className="bg-dark-900 border-l border-slate-800 w-80 h-full flex flex-col font-mono text-xs select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 bg-[#161B22] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitPullRequest className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-slate-200 text-xs">STAGED PR HOTFIXES</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-400 text-[10px] font-bold">
          {stagedPrs.length} PRs
        </span>
      </div>

      {/* Action Stage Button */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/60">
        <button
          onClick={onStagePr}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Stage PR Hotfix to Branch</span>
        </button>
      </div>

      {/* Covert Sabotage Palette (Mafia Only) */}
      {isMafia && (
        <div className="p-3 bg-red-950/40 border-b border-red-900/50 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-red-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-red-500 animate-pulse" /> COVERT SABOTAGE PALETTE
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {/* Memory Leak */}
            <button
              onClick={onActivateMemoryLeak}
              disabled={sabotageState.memoryLeakActive}
              className={`w-full p-2 rounded-lg border text-[10px] font-bold flex items-center justify-between transition-all ${
                !sabotageState.memoryLeakActive
                  ? 'bg-red-950/60 border-red-800 text-red-200 hover:bg-red-900/80'
                  : 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-red-400" />
                <span>Inject Memory Leak</span>
              </span>
              <span>{sabotageState.memoryLeakActive ? 'Active' : 'Deploy'}</span>
            </button>

            {/* Silent Regression */}
            <button
              onClick={onActivateSilentRegression}
              disabled={sabotageState.silentRegressionActive}
              className={`w-full p-2 rounded-lg border text-[10px] font-bold flex items-center justify-between transition-all ${
                !sabotageState.silentRegressionActive
                  ? 'bg-amber-950/60 border-amber-800 text-amber-200 hover:bg-amber-900/80'
                  : 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Silent Bug Regression</span>
              </span>
              <span>{sabotageState.silentRegressionActive ? 'Active' : 'Deploy'}</span>
            </button>

            {/* Syntax Masking */}
            {otherPlayers.length > 0 && (
              <div className="pt-1">
                <label className="text-[9px] text-slate-400 block mb-1">Target Syntax Masking:</label>
                <select
                  onChange={e => {
                    const target = otherPlayers.find(p => p.id === e.target.value);
                    if (target) onActivateSyntaxMasking(target);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-red-300 font-bold"
                >
                  <option value="">Select Dev to Desync...</option>
                  {otherPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staged PR Stream */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {stagedPrs.length === 0 ? (
          <div className="text-slate-500 italic text-center py-8 text-xs">
            No staged PR hotfixes yet. Click "Stage PR Hotfix" above to create pull requests.
          </div>
        ) : (
          stagedPrs.slice().reverse().map(pr => (
            <div
              key={pr.id}
              className="p-3 rounded-xl bg-dark-800 border border-slate-800 space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-purple-400 font-mono">#{pr.prNumber}</span>
                <span className="text-[10px] text-slate-500">{pr.timestamp}</span>
              </div>

              <h4 className="font-bold text-slate-100 text-xs truncate">{pr.title}</h4>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>By @{pr.authorName}</span>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  pr.status === 'MERGED'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-purple-950 text-purple-300 border border-purple-800'
                }`}>
                  {pr.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
