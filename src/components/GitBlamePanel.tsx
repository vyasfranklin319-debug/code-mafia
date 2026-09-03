import React, { useState } from 'react';
import { GitCommit, Player, SabotageState } from '../types/game';
import { GitCommit as GitIcon, EyeOff, Zap, ShieldAlert, Sparkles, Plus, Minus, FileCode } from 'lucide-react';

interface GitBlamePanelProps {
  commits: GitCommit[];
  currentUser: Player;
  sabotageState: SabotageState;
  onActivateShadowCommit: () => void;
  onTriggerFakeCi: () => void;
  onInjectFlakyTest: () => void;
}

export const GitBlamePanel: React.FC<GitBlamePanelProps> = ({
  commits,
  currentUser,
  sabotageState,
  onActivateShadowCommit,
  onTriggerFakeCi,
  onInjectFlakyTest
}) => {
  const isMafia = currentUser.role === 'MAFIA';
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);

  const isFakeCiActive = sabotageState.fakeCiActiveUntil !== null && sabotageState.fakeCiActiveUntil > Date.now();

  return (
    <div className="bg-dark-900 border-l border-slate-800 w-80 h-full flex flex-col font-mono text-xs select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 bg-[#161B22] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitIcon className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200 text-xs">GIT BLAME AUDIT TRAIL</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
          {commits.length} commits
        </span>
      </div>

      {/* Mafia Sabotage Powers Toolbar (Mafia Only) */}
      {isMafia && (
        <div className="p-3 bg-red-950/40 border-b border-red-900/50 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-red-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-red-500 animate-pulse" /> MAFIA SABOTAGE ABILITIES
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {/* Shadow Commit */}
            <button
              onClick={onActivateShadowCommit}
              disabled={sabotageState.shadowCommitsRemaining <= 0}
              title="Anonymize next edit as @ghost_author"
              className={`p-1.5 rounded border text-[10px] font-bold flex flex-col items-center justify-center text-center transition-all ${
                sabotageState.shadowCommitsRemaining > 0
                  ? 'bg-red-900/40 hover:bg-red-800/60 border-red-700 text-red-200'
                  : 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5 mb-0.5 text-amber-400" />
              <span>Shadow Edit ({sabotageState.shadowCommitsRemaining})</span>
            </button>

            {/* Fake CI Run */}
            <button
              onClick={onTriggerFakeCi}
              disabled={isFakeCiActive}
              title="Invert test pass/fail results for 15 seconds"
              className={`p-1.5 rounded border text-[10px] font-bold flex flex-col items-center justify-center text-center transition-all ${
                !isFakeCiActive
                  ? 'bg-amber-950/60 hover:bg-amber-900/80 border-amber-700 text-amber-200'
                  : 'bg-amber-900/40 border-amber-500 text-amber-400 animate-pulse'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 mb-0.5 text-amber-400" />
              <span>{isFakeCiActive ? 'Fake CI On' : 'Fake CI Run'}</span>
            </button>

            {/* Flaky Test Injection */}
            <button
              onClick={onInjectFlakyTest}
              disabled={sabotageState.flakyTestInjected}
              title="Inject intermittent regression assertion into test suite"
              className={`p-1.5 rounded border text-[10px] font-bold flex flex-col items-center justify-center text-center transition-all ${
                !sabotageState.flakyTestInjected
                  ? 'bg-purple-950/60 hover:bg-purple-900/80 border-purple-700 text-purple-200'
                  : 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 mb-0.5 text-purple-400" />
              <span>{sabotageState.flakyTestInjected ? 'Flaky Active' : 'Flaky Trap'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Commit Stream List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {commits.length === 0 ? (
          <div className="text-slate-500 italic text-center py-8 text-xs">
            No commits recorded yet. Edit code to create Git commit history.
          </div>
        ) : (
          commits.slice().reverse().map(commit => {
            const isShadow = commit.isShadow;
            const isSelected = selectedCommit?.id === commit.id;

            return (
              <div
                key={commit.id}
                onClick={() => setSelectedCommit(isSelected ? null : commit)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isShadow
                    ? 'bg-red-950/30 border-red-900/60 hover:border-red-600'
                    : isSelected
                    ? 'bg-blue-950/40 border-blue-500 shadow-md'
                    : 'bg-dark-800 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Commit Header Line */}
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-mono text-[10px] font-bold">
                      {commit.hash}
                    </span>
                    <span className={`font-bold ${isShadow ? 'text-red-400 italic' : 'text-slate-200'}`}>
                      @{commit.authorName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{commit.timestamp}</span>
                </div>

                {/* Diff Stat Summary */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center space-x-1 truncate max-w-[170px]">
                    <FileCode className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{commit.filePath.split('/').pop()}</span>
                  </div>
                  <div className="flex items-center space-x-1 font-bold">
                    <span className="text-emerald-400 flex items-center"><Plus className="w-2.5 h-2.5" />{commit.linesAdded}</span>
                    <span className="text-red-400 flex items-center"><Minus className="w-2.5 h-2.5" />{commit.linesRemoved}</span>
                  </div>
                </div>

                {/* Expanded Diff Preview Snippet */}
                {isSelected && (
                  <div className="mt-2 pt-2 border-t border-slate-700/60 text-[10px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 leading-tight">
                    <div className="text-[9px] text-slate-500 font-mono mb-1 uppercase tracking-wider">COMMIT DIFF SNIPPET:</div>
                    <code className="block whitespace-pre-wrap text-cyan-300">{commit.diffSnippet}</code>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
