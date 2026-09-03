import React, { useState } from 'react';
import { GameSession, Player } from '../types/game';
import { PhaseTimer } from '../components/PhaseTimer';
import { Vote, Check, UserX, AlertCircle, Sparkles } from 'lucide-react';

interface VotingPageProps {
  session: GameSession;
  currentUser: Player;
  onCastVote: (targetPlayerId: string | null) => void;
  onTimerExpired: () => void;
}

export const VotingPage: React.FC<VotingPageProps> = ({
  session,
  currentUser,
  onCastVote,
  onTimerExpired
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(
    session.votes[currentUser.id] !== undefined ? session.votes[currentUser.id] : null
  );

  const alivePlayers = session.players.filter(p => p.isAlive);
  const isAlive = currentUser.isAlive;

  const handleVoteSelect = (targetId: string | null) => {
    if (!isAlive) return;
    setSelectedTargetId(targetId);
    onCastVote(targetId);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 select-none font-sans">
      {/* Header */}
      <div className="gaming-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-purple-400 text-glow-purple" />
            <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">
              ROUND {session.currentRound} • CONFIDENTIAL VOTING ARENA
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight text-glow-purple">
            Cast Elimination Vote
          </h1>
          <p className="text-xs text-slate-400 max-w-lg">
            Votes remain confidential until tallying reveal. The operative with plurality will be eliminated.
          </p>
        </div>

        <div className="z-10 shrink-0">
          <PhaseTimer
            endsAt={session.phaseEndsAt}
            onTimerExpired={onTimerExpired}
            label="VOTING CLOSES"
          />
        </div>
      </div>

      {/* Dead Player Spectator Banner */}
      {!isAlive && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 font-sans text-xs flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
          <span>You have been eliminated! You are observing the voting phase in spectator mode.</span>
        </div>
      )}

      {/* Target Player Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {alivePlayers.map(p => {
          const isSelf = p.id === currentUser.id;
          const isSelected = selectedTargetId === p.id;

          return (
            <div
              key={p.id}
              onClick={() => !isSelf && handleVoteSelect(p.id)}
              className={`p-6 rounded-3xl transition-all duration-200 ${
                isSelf
                  ? 'bg-black/30 border border-white/5 opacity-50 cursor-not-allowed'
                  : isSelected
                  ? 'gaming-card-active scale-105 cursor-pointer'
                  : 'gaming-card hover:border-purple-500/50 cursor-pointer hover:scale-102'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${p.avatarColor || 'bg-gradient-to-tr from-purple-600 to-indigo-600'} text-white font-black flex items-center justify-center text-lg shadow-lg border border-purple-400/40`}>
                  {p.displayName.charAt(0).toUpperCase()}
                </div>

                {isSelected && (
                  <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md animate-pulse">
                    <Check className="w-3.5 h-3.5" /> VOTED TARGET
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                <span>{p.displayName}</span>
                {isSelf && <span className="text-[10px] text-slate-500 font-normal bg-white/5 px-2 py-0.5 rounded-full border border-white/10">(You)</span>}
              </h3>
            </div>
          );
        })}
      </div>

      {/* Abstain Option */}
      {isAlive && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => handleVoteSelect(null)}
            className={`px-8 py-3 rounded-2xl font-sans text-xs font-bold flex items-center gap-2.5 transition-all shadow-xl ${
              selectedTargetId === null
                ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-white border border-purple-500 shadow-purple-950/40 ring-2 ring-purple-500/50 scale-105'
                : 'gaming-card text-slate-400 hover:text-white'
            }`}
          >
            <UserX className="w-4 h-4 text-purple-400" />
            <span>Abstain / Skip Vote</span>
          </button>
        </div>
      )}
    </div>
  );
};
