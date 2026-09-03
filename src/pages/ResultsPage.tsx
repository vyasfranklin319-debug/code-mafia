import React, { useState, useEffect } from 'react';
import { GameSession, GameHistoryItem } from '../types/game';
import { ReplayEngine } from '../components/ReplayEngine';
import { Trophy, Skull, RotateCcw, Home, Award, PlayCircle, Sparkles } from 'lucide-react';
import { allContentPacks } from '../contentPacks';

interface ResultsPageProps {
  session: GameSession;
  onPlayAgain: () => void;
  onNavigateHome: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  session,
  onPlayAgain,
  onNavigateHome
}) => {
  const isDevWin = session.winner === 'DEVELOPERS';
  const [activeTab, setActiveTab] = useState<'matrix' | 'replay'>('matrix');

  // Automatically save real match telemetry when ResultsPage mounts
  useEffect(() => {
    const packObj = allContentPacks.find(p => p.id === session.config.packId);
    const packName = packObj ? packObj.name : 'Task Master API';
    const language = packObj ? packObj.language : 'JavaScript';
    const mafiaCount = session.players.filter(p => p.role === 'MAFIA').length;

    const historyRecord: GameHistoryItem = {
      id: `hist-${Date.now()}`,
      date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      packName,
      language,
      playerCount: session.players.length,
      mafiaCount,
      winner: session.winner || 'DEVELOPERS',
      durationMinutes: Math.max(1, Math.round(5)),
      roundsCount: session.currentRound || 1
    };

    // 1. Post to backend API
    fetch('http://localhost:3001/api/v1/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(historyRecord)
    }).catch(err => console.warn('Could not post match to backend API history store', err));

    // 2. Save to local storage history array
    try {
      const existing = localStorage.getItem('code_mafia_match_history');
      const list: GameHistoryItem[] = existing ? JSON.parse(existing) : [];
      list.unshift(historyRecord);
      localStorage.setItem('code_mafia_match_history', JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage error saving match history', e);
    }
  }, [session.id]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 select-none font-sans">
      {/* Victory Banner */}
      <div className={`relative overflow-hidden rounded-3xl p-8 border shadow-2xl text-center space-y-4 ${
        isDevWin
          ? 'gaming-card-hero'
          : 'bg-gradient-to-br from-red-950 via-[#101118] to-amber-950/60 border-red-500/40 shadow-red-950/40'
      }`}>
        <div className="inline-flex p-4 rounded-2xl bg-black/40 border border-white/10 shadow-xl">
          {isDevWin ? (
            <Trophy className="w-16 h-16 text-purple-300 text-glow-purple" />
          ) : (
            <Skull className="w-16 h-16 text-red-500 text-glow-red animate-pulse" />
          )}
        </div>

        <span className="text-xs font-mono uppercase tracking-widest text-purple-300 block">
          MATCH FINALE RESULTS
        </span>

        <h1 className={`text-4xl font-black tracking-tight ${
          isDevWin ? 'text-white text-glow-purple' : 'text-red-500 text-glow-red'
        }`}>
          {isDevWin ? 'DEVELOPERS VICTORY!' : 'MAFIA SABOTAGE VICTORY!'}
        </h1>

        <p className="text-sm text-slate-300 max-w-xl mx-auto">
          {session.winReason || (isDevWin ? 'All unit tests passed successfully!' : 'Developers were unable to pass the test suite.')}
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <button
            onClick={onPlayAgain}
            className="gaming-btn-purple px-8 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again (Same Lobby)</span>
          </button>

          <button
            onClick={onNavigateHome}
            className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-sm border border-white/10 transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Tab Controls: Matrix vs Replay */}
      <div className="flex items-center space-x-3 border-b border-white/10 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
            activeTab === 'matrix' ? 'gaming-btn-purple' : 'bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Player Role Matrix & Metrics</span>
        </button>

        <button
          onClick={() => setActiveTab('replay')}
          className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
            activeTab === 'replay' ? 'gaming-btn-purple' : 'bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <PlayCircle className="w-4 h-4" />
          <span>Post-Mortem Replay Scrubber</span>
        </button>
      </div>

      {activeTab === 'matrix' ? (
        /* Full Player Roster & Role Matrix */
        <div className="gaming-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" /> Full Player Role Matrix & Metrics
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase">
                  <th className="pb-3 px-3">Operative</th>
                  <th className="pb-3 px-3">Role</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Bugs Fixed</th>
                  <th className="pb-3 px-3">Tests Run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {session.players.map(p => {
                  const isMafia = p.role === 'MAFIA';
                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-3 font-bold flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${p.avatarColor || 'bg-purple-600'} text-white text-xs font-black flex items-center justify-center border border-purple-400/40`}>
                          {p.displayName.charAt(0)}
                        </div>
                        <span>{p.displayName}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                          isMafia ? 'bg-red-950/80 text-red-400 border border-red-800/60' : 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                        }`}>
                          {p.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {p.isAlive ? (
                          <span className="text-emerald-400 font-bold">Survived</span>
                        ) : (
                          <span className="text-slate-500">Eliminated</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-purple-300 font-mono font-bold">{p.stats.bugsFixed}</td>
                      <td className="py-3.5 px-3 text-slate-300 font-mono">{p.stats.testsRun}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Post-Mortem Replay Engine */
        <ReplayEngine session={session} />
      )}
    </div>
  );
};
