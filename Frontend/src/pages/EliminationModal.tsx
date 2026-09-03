import React from 'react';
import { GameSession } from '../types/game';
import { Skull, Shield, ArrowRight, UserX } from 'lucide-react';

interface EliminationModalProps {
  session: GameSession;
  onContinue: () => void;
}

export const EliminationModal: React.FC<EliminationModalProps> = ({ session, onContinue }) => {
  const latestElimination = session.eliminationHistory[session.eliminationHistory.length - 1];
  if (!latestElimination) return null;

  const { eliminatedPlayerName, eliminatedPlayerRole, voteTally, wasTie } = latestElimination;
  const isMafia = eliminatedPlayerRole === 'MAFIA';

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl glass-panel p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block">
          ROUND {latestElimination.roundNumber} ELIMINATION REVEAL
        </span>

        {/* Outcome Card */}
        {eliminatedPlayerName ? (
          <div className="space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-dark-900 border border-slate-700/80 shadow-xl">
              {isMafia ? (
                <Skull className="w-16 h-16 text-red-500 text-glow-red animate-pulse" />
              ) : (
                <Shield className="w-16 h-16 text-blue-400 text-glow-blue" />
              )}
            </div>

            <h2 className="text-2xl font-extrabold font-mono text-slate-100">
              {eliminatedPlayerName} Was Voted Out!
            </h2>

            {eliminatedPlayerRole && (
              <div className={`inline-block px-4 py-1.5 rounded-full border text-xs font-bold font-mono ${
                isMafia
                  ? 'bg-red-950/80 border-red-500 text-red-400 shadow-lg shadow-red-900/50'
                  : 'bg-blue-950/80 border-blue-500 text-blue-400 shadow-lg shadow-blue-900/50'
              }`}>
                THEY WERE {isMafia ? 'MAFIA!' : 'A DEVELOPER.'}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-dark-900 border border-slate-700/80 shadow-xl">
              <UserX className="w-16 h-16 text-amber-400" />
            </div>

            <h2 className="text-2xl font-extrabold font-mono text-slate-100">
              No Player Was Eliminated
            </h2>

            <p className="text-xs font-mono text-slate-400">
              {wasTie ? 'The vote resulted in a tie tie-break rule applied.' : 'No majority votes cast.'}
            </p>
          </div>
        )}

        {/* Vote Tally Breakdown */}
        <div className="bg-dark-900/80 border border-slate-800 p-4 rounded-xl space-y-2 text-left text-xs font-mono">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            VOTE TALLY RESULTS:
          </span>
          {Object.entries(voteTally).map(([pid, count]) => {
            const player = session.players.find(p => p.id === pid);
            if (!player) return null;
            return (
              <div key={pid} className="flex justify-between items-center py-0.5 border-b border-slate-800/60 text-slate-300">
                <span>{player.displayName}</span>
                <span className="font-bold text-cyan-400">{count} {count === 1 ? 'vote' : 'votes'}</span>
              </div>
            );
          })}
        </div>

        {/* Continue CTA */}
        <button
          onClick={onContinue}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-white font-bold font-mono text-sm shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
