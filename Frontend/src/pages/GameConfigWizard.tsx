import React, { useState } from 'react';
import { GameConfig, TransparencyLevel, TieRule } from '../types/game';
import { allContentPacks } from '../contentPacks';
import { ArrowLeft, Check, Sliders, Play, Users, Clock, Shield, Sparkles, Zap, Flame } from 'lucide-react';

interface GameConfigWizardProps {
  currentUserName?: string;
  onCancel: () => void;
  onCreateGame: (config: GameConfig, hostName: string) => void;
}

export const GameConfigWizard: React.FC<GameConfigWizardProps> = ({ currentUserName, onCancel, onCreateGame }) => {
  const defaultHost = currentUserName || localStorage.getItem('code_mafia_active_user') || '';
  const [hostName, setHostName] = useState(defaultHost);
  const [selectedPackId, setSelectedPackId] = useState(allContentPacks[0].id);
  const [playerCount, setPlayerCount] = useState(6);
  const [mafiaCount, setMafiaCount] = useState(2);
  const [workRoundSeconds, setWorkRoundSeconds] = useState(180);
  const [discussionSeconds, setDiscussionSeconds] = useState(90);
  const [votingSeconds, setVotingSeconds] = useState(45);
  const [transparencyLevel, setTransparencyLevel] = useState<TransparencyLevel>('FULL');
  const [tieRule, setTieRule] = useState<TieRule>('NO_ELIMINATION');

  const modes = [
    {
      id: allContentPacks[0].id, // task-master-js
      tagLeft: 'JAVASCRIPT',
      badgeRight: 'POPULAR',
      title: 'TASK MASTER API',
      description: 'Debug async queue ordering, priority filter type coercions, and task status mutations.',
      players: '6-12 PLAYERS',
      avgTime: '15 min',
      intensitySegments: 3
    },
    {
      id: allContentPacks[1].id, // inventory-py
      tagLeft: 'PYTHON 3.11',
      badgeRight: 'BALANCED',
      title: 'INVENTORY & DISCOUNT MANAGER',
      description: 'Fix float tax rounding errors, negative inventory allocations, and discount boundary tiers.',
      players: '5v5 ARENA',
      avgTime: '20 min',
      intensitySegments: 4
    },
    {
      id: allContentPacks[2].id, // auth-limiter-js
      tagLeft: 'NODE.JS HARD',
      badgeRight: 'STRATEGIC',
      title: 'AUTH & RATE LIMITER',
      description: 'Debug token expiration timestamp units and sliding-window rate limit counters.',
      players: '6v6 RANKED',
      avgTime: '25 min',
      intensitySegments: 5
    },
    {
      id: 'custom-sandbox',
      tagLeft: 'FREE FOR ALL',
      badgeRight: 'RANKED',
      title: 'CUSTOM CODEBASE SANDBOX',
      description: 'No teammates. No mercy. Pure mechanical debugging skill decides the winner.',
      players: 'CUSTOM',
      avgTime: 'Configurable',
      intensitySegments: 5
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: GameConfig = {
      packId: selectedPackId === 'custom-sandbox' ? allContentPacks[0].id : selectedPackId,
      playerCount,
      mafiaCount,
      workRoundSeconds,
      discussionSeconds,
      votingSeconds,
      transparencyLevel,
      tieRule,
      passRateThreshold: 100,
      maxRounds: 3
    };
    onCreateGame(config, hostName || 'VoidRunner_X');
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 font-sans text-xs select-none space-y-8">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Arena Hub
      </button>

      {/* Main Title Section */}
      <div className="space-y-1">
        <span className="gaming-pill flex items-center gap-1.5 w-fit">
          <Zap className="w-3.5 h-3.5 text-purple-300" />
          MATCHMAKING CONFIGURATION
        </span>
        <h1 className="text-3xl font-black text-white tracking-wider uppercase text-glow-purple">
          SELECT ARENA CONTENT PACK
        </h1>
      </div>

      {/* 2x2 MODE SELECTION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modes.map(mode => {
          const isSelected = selectedPackId === mode.id;

          return (
            <div
              key={mode.id}
              onClick={() => setSelectedPackId(mode.id)}
              className={`p-6 rounded-3xl cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'gaming-card-active scale-102 ring-2 ring-purple-500/80'
                  : 'gaming-card hover:border-purple-500/40'
              }`}
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  {mode.tagLeft}
                </span>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isSelected
                    ? 'bg-purple-600/40 text-purple-200 border border-purple-400/50'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}>
                  {mode.badgeRight}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h2 className={`text-lg font-black tracking-wide uppercase ${
                  isSelected ? 'text-white text-glow-purple' : 'text-slate-100'
                }`}>
                  {mode.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {mode.description}
                </p>
              </div>

              {/* Metrics Footer Row */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-bold">PLAYERS</span>
                  <span className="font-bold text-slate-200">{mode.players}</span>
                </div>

                <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-bold">AVG TIME</span>
                  <span className="font-bold text-slate-200">{mode.avgTime}</span>
                </div>

                <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">DIFFICULTY</span>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-3.5 h-1.5 rounded-full ${
                          idx < mode.intensitySegments ? 'bg-purple-500 shadow-sm shadow-purple-500/50' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* START MATCH CTA ACTION BAR */}
      <form onSubmit={handleSubmit} className="gaming-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Host Operative Name</label>
            <input
              type="text"
              required
              value={hostName}
              onChange={e => setHostName(e.target.value)}
              className="gaming-input px-4 py-2 text-xs font-bold text-purple-300"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Match Roster Size</label>
            <select
              value={playerCount}
              onChange={e => {
                const count = Number(e.target.value);
                setPlayerCount(count);
                if (count <= 6) setMafiaCount(2);
                else if (count <= 10) setMafiaCount(3);
                else setMafiaCount(4);
              }}
              className="gaming-input px-4 py-2 text-xs font-bold text-slate-200"
            >
              <option value={6}>6 Operatives (2 Saboteurs)</option>
              <option value={8}>8 Operatives (3 Saboteurs)</option>
              <option value={10}>10 Operatives (3 Saboteurs)</option>
              <option value={12}>12 Operatives (4 Saboteurs)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="gaming-btn-purple px-8 py-3 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>CREATE ARENA ROOM</span>
        </button>
      </form>
    </div>
  );
};
