import React, { useState } from 'react';
import { GameSession, Player, PrHotfix } from '../types/game';
import { Lock, AlertOctagon, GitCompare, MessageSquare, Check, X, ShieldAlert } from 'lucide-react';

interface CodeFreezeModalProps {
  session: GameSession;
  currentUser: Player;
  onClose: () => void;
  onAdvanceToVoting: () => void;
}

export const CodeFreezeModal: React.FC<CodeFreezeModalProps> = ({
  session,
  currentUser,
  onClose,
  onAdvanceToVoting
}) => {
  const primaryFile = session.files[0];
  const oldContent = primaryFile ? primaryFile.initialContent : '';
  const newContent = primaryFile ? primaryFile.currentContent : '';

  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const maxLines = Math.max(oldLines.length, newLines.length);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-dark-900 border border-red-800/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]">
        {/* War Room Header */}
        <div className="p-4 bg-red-950/80 border-b border-red-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-900 border border-red-700 text-white animate-pulse">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-red-400 font-bold tracking-widest block uppercase">
                EMERGENCY CODE FREEZE • INCIDENT REVIEW WAR ROOM
              </span>
              <h2 className="text-xl font-extrabold text-slate-100 font-mono tracking-tight">
                Editor Locked: Reviewing Staged Diff Artifacts
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onAdvanceToVoting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Call Emergency Vote</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Git Diff Inspector Side-by-Side View */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-300 font-bold border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <GitCompare className="w-4 h-4" /> GIT DIFF INSPECTOR ({primaryFile?.name})
            </span>
            <span className="text-slate-500 text-[10px]">Comparing Initial Master vs Current Staging Branch</span>
          </div>

          {/* Line Diff View */}
          <div className="bg-[#0D1117] border border-slate-800 rounded-xl overflow-hidden text-xs leading-6">
            <div className="grid grid-cols-2 bg-[#161B22] p-2 text-[10px] font-bold text-slate-400 border-b border-slate-800">
              <div>INITIAL MASTER BASE</div>
              <div>CURRENT STAGED HOTFIX</div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 font-mono">
              {Array.from({ length: maxLines }).map((_, idx) => {
                const oldL = oldLines[idx];
                const newL = newLines[idx];

                const isDiff = oldL !== newL;
                const isAdded = oldL === undefined && newL !== undefined;
                const isRemoved = oldL !== undefined && newL === undefined;

                return (
                  <div key={idx} className={`grid grid-cols-2 border-b border-slate-800/40 text-[11px] ${
                    isDiff ? (isAdded ? 'bg-emerald-950/40 text-emerald-300' : isRemoved ? 'bg-red-950/40 text-red-300' : 'bg-amber-950/40 text-amber-200') : 'text-slate-400'
                  }`}>
                    <div className="px-2 truncate select-none border-r border-slate-800/60">
                      <span className="text-slate-600 mr-2 w-6 inline-block">{idx + 1}</span>
                      {oldL !== undefined ? oldL : ''}
                    </div>
                    <div className="px-2 truncate select-none">
                      <span className="text-slate-600 mr-2 w-6 inline-block">{idx + 1}</span>
                      {newL !== undefined ? newL : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Debate Clue Prompt */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
            <span className="font-bold text-amber-400 block flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> INCIDENT ANALYSIS QUESTION:
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Examine line modifications highlighted above. Was an off-by-one or condition modification introduced accidentally by a Developer, or covertly planted by the Mafia?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
