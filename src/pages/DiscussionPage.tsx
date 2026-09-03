import React from 'react';
import { GameSession, Player } from '../types/game';
import { ChatPanel } from '../components/ChatPanel';
import { PhaseTimer } from '../components/PhaseTimer';
import { MessageSquare, Activity, ArrowRight } from 'lucide-react';

interface DiscussionPageProps {
  session: GameSession;
  currentUser: Player;
  onSendMessage: (text: string, isMafiaOnly?: boolean) => void;
  onAdvanceToVoting: () => void;
}

export const DiscussionPage: React.FC<DiscussionPageProps> = ({
  session,
  currentUser,
  onSendMessage,
  onAdvanceToVoting
}) => {
  const recentEvents = session.activityFeed.filter(a => a.type === 'EDIT' || a.type === 'TEST_RUN');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-dark-800 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              ROUND {session.currentRound} • DISCUSSION PHASE
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 font-mono">
            Debate, Accuse & Review Clues
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Examine recent code edits and test results. Identify who is sabotaging the test suite!
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <PhaseTimer
            endsAt={session.phaseEndsAt}
            onTimerExpired={onAdvanceToVoting}
            label="DISCUSSION TIMER"
          />

          {currentUser.isHost && (
            <button
              onClick={onAdvanceToVoting}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-white font-bold font-mono text-xs shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <span>Open Voting</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Discussion Chat + Activity Recap */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[580px]">
        {/* Discussion Chat (2 Cols) */}
        <div className="md:col-span-2 bg-dark-800 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <ChatPanel
            messages={session.chatMessages}
            currentUser={currentUser}
            onSendMessage={onSendMessage}
          />
        </div>

        {/* Activity Feed & Clues Recap Panel */}
        <div className="bg-dark-800 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" /> Activity Recap Timeline
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs font-mono">
            {recentEvents.length === 0 ? (
              <div className="text-slate-500 italic text-center py-8">No code edits or test runs logged yet this round.</div>
            ) : (
              recentEvents.map(act => (
                <div key={act.id} className="p-2.5 rounded-xl bg-dark-900 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-cyan-400">{act.playerName}</span>
                    <span className="text-slate-500">{act.timestamp}</span>
                  </div>
                  <p className="text-slate-300 text-xs">{act.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
