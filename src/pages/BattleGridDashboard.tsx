import React, { useState } from 'react';
import { 
  PlayCircle, Plus, CheckCircle, Clock, Shield, Sparkles, Zap, 
  Gamepad2, Users, Flame, ArrowRight, Download, RefreshCw, Award, Activity, Search, Star
} from 'lucide-react';
import { allContentPacks } from '../contentPacks';

interface BattleGridDashboardProps {
  onNewGame: () => void;
  onViewHistory: () => void;
  onViewAdminPacks: () => void;
  showFavoritesOnly?: boolean;
}

export const BattleGridDashboard: React.FC<BattleGridDashboardProps> = ({
  onNewGame,
  onViewHistory,
  onViewAdminPacks,
  showFavoritesOnly = false
}) => {
  // Favorite packs state persisted in localStorage
  const [favoritePackIds, setFavoritePackIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('code_mafia_favorite_packs');
      return saved ? JSON.parse(saved) : ['task-master-js'];
    } catch (e) {
      return ['task-master-js'];
    }
  });

  const toggleFavorite = (packId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = favoritePackIds.includes(packId)
      ? favoritePackIds.filter(id => id !== packId)
      : [...favoritePackIds, packId];
    setFavoritePackIds(next);
    localStorage.setItem('code_mafia_favorite_packs', JSON.stringify(next));
  };

  const friends = [
    { name: 'EliteKnight', status: 'In Lobby • NA-East', role: 'Innocent Dev', color: 'from-purple-600 to-indigo-600', isOnline: true },
    { name: 'CyberShadow', status: 'In Match • Round 2', role: 'Mafia Saboteur', color: 'from-[#7c3aed] to-violet-800', isOnline: true },
    { name: 'ValkyrieCode', status: 'Debugging PR #4', role: 'Innocent Dev', color: 'from-indigo-600 to-blue-600', isOnline: true },
    { name: 'PhantomZero', status: 'Offline • 2h ago', role: 'Lead Inspector', color: 'from-slate-700 to-slate-800', isOnline: false }
  ];

  // Filter packs if showFavoritesOnly is active
  const displayedPacks = showFavoritesOnly
    ? allContentPacks.filter(p => favoritePackIds.includes(p.id))
    : allContentPacks;

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans p-6 lg:p-8 space-y-8 select-none">
      
      {/* 1. TOP LAYOUT GRID: HERO SHOWCASE (LEFT 2/3) + UPDATES SIDEBAR (RIGHT 1/3) (Hidden when Favorites Only) */}
      {!showFavoritesOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* HERO SHOWCASE CARD */}
          <div className="lg:col-span-2 gaming-card-hero p-8 relative overflow-hidden flex flex-col justify-between min-h-[320px] group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <span className="gaming-pill flex items-center gap-1.5 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                FEATURED ARENA SEASON 4
              </span>
              <span className="text-xs text-purple-300/80 font-mono font-bold tracking-wider">
                MATCH ID #9482-CORE
              </span>
            </div>

            <div className="relative z-10 my-6 max-w-lg space-y-3">
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-none text-glow-purple">
                CODE MAFIA: DEEP CORE
              </h1>
              <p className="text-xs lg:text-sm text-slate-300/90 leading-relaxed">
                Join 6-player real-time collaborative debugging arenas. Hunt down covert saboteurs, patch memory leaks, and deploy emergency hotfixes before CI/CD collapses.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-4">
              <div className="px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-extrabold text-sm shadow-inner">
                $0.00 <span className="text-[10px] text-purple-400 font-normal ml-1 uppercase">FREE ACCESS</span>
              </div>

              <button
                onClick={onNewGame}
                className="gaming-btn-purple px-8 py-3 rounded-xl font-bold text-sm tracking-wider flex items-center gap-2"
              >
                <PlayCircle className="w-5 h-5 fill-current" />
                <span>LAUNCH ARENA MATCH</span>
              </button>
            </div>

            <div className="absolute right-6 bottom-4 hidden sm:block opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none">
              <Zap className="w-64 h-64 text-purple-400/40" />
            </div>
          </div>

          {/* RIGHT TOP: UPDATES SIDEBAR CARD */}
          <div className="gaming-card p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-xs font-bold text-slate-300 tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-purple-400" />
                CONTENT PACKS & UPDATES
              </h2>
              <button 
                onClick={onViewAdminPacks}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase"
              >
                See all
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#141520] border border-white/5 space-y-3 relative overflow-hidden group">
              <div className="w-full h-24 rounded-xl bg-gradient-to-tr from-purple-900/60 to-indigo-900/40 border border-purple-500/20 flex items-center justify-center relative">
                <Gamepad2 className="w-10 h-10 text-purple-400/80 group-hover:scale-110 transition-transform" />
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-purple-600/80 text-white text-[9px] font-mono font-bold">
                  v2.4 HOTFIX
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-100">AST Sentinel & Memory Leak 2.0</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  New AST ruleset scanner enabled for lead inspectors with covert sabotage detection capabilities.
                </p>
              </div>

              <button 
                onClick={onViewAdminPacks}
                className="w-full py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/40 text-xs font-bold transition-colors"
              >
                INSPECT CONTENT PACKS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MIDDLE SECTION: FAVORITE & FEATURED GAME MODES ONLY */}
      <div id="featured-arenas" className="space-y-4">
        {showFavoritesOnly && (
          <div className="gaming-card p-4 flex items-center justify-between border border-purple-500/40 bg-purple-950/30">
            <div className="flex items-center space-x-3">
              <Star className="w-5 h-5 text-purple-300 fill-current animate-pulse" />
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">FAVORITES & FEATURED GAME MODES ONLY</h3>
                <span className="text-xs text-purple-300">Displaying your starred operative content pack arenas ({displayedPacks.length} packs)</span>
              </div>
            </div>
            <span className="gaming-pill font-mono">STAR FILTER ACTIVE</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-100 tracking-wider">
              {showFavoritesOnly ? 'FEATURED & FAVORITE ARENA PACKS' : 'ACTIVE ARENA CONTENT PACKS'}
            </h2>
            <p className="text-xs text-slate-400">Select a content pack codebase to launch an arena match or click the Star icon to add to favorites</p>
          </div>
          <button 
            onClick={onNewGame}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 uppercase"
          >
            <span>See all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Arenas Grid dynamically mapped */}
        {displayedPacks.length === 0 ? (
          <div className="gaming-card p-10 text-center space-y-3">
            <Star className="w-10 h-10 text-purple-400/40 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200 uppercase">No Starred Favorite Packs Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click the <Star className="w-3.5 h-3.5 inline text-purple-400 fill-current" /> star button on any content pack card in the launch pad to add it to your favorites.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPacks.map((pack, idx) => {
              const isStarred = favoritePackIds.includes(pack.id);
              return (
                <div key={pack.id} className={`gaming-card p-6 flex flex-col justify-between space-y-4 relative overflow-hidden group transition-all ${
                  isStarred ? 'border-purple-500/40 shadow-lg shadow-purple-950/40' : ''
                }`}>
                  <div className="flex items-start justify-between">
                    <span className="gaming-pill bg-purple-600/20 text-purple-300 border-purple-500/40 font-mono">
                      {pack.language.toUpperCase()}
                    </span>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-purple-400 font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                        {pack.difficulty}
                      </span>

                      {/* STAR BUTTON FOR FAVORITING PACK */}
                      <button
                        onClick={(e) => toggleFavorite(pack.id, e)}
                        className={`p-1.5 rounded-xl border transition-all ${
                          isStarred 
                            ? 'bg-purple-600/30 border-purple-400 text-purple-300 shadow-md shadow-purple-950/60' 
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-purple-300 hover:bg-white/10'
                        }`}
                        title={isStarred ? 'Remove from Starred Favorites' : 'Add to Starred Favorites'}
                      >
                        <Star className={`w-4 h-4 ${isStarred ? 'fill-current text-purple-300' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 py-2">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                      {idx === 0 ? <Shield className="w-6 h-6" /> : idx === 1 ? <Zap className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                    </div>
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      <span>{pack.name}</span>
                      {isStarred && <Star className="w-3.5 h-3.5 text-purple-300 fill-current shrink-0" />}
                    </h3>
                    <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                      {pack.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-xs text-slate-400 font-mono">{pack.testSuite.length} Unit Tests</span>
                    <button 
                      onClick={onNewGame}
                      className="gaming-btn-purple px-5 py-2 rounded-xl text-xs font-bold"
                    >
                      PLAY NOW
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. BOTTOM ROW: DIAGNOSTICS + ONLINE FRIENDS SIDEBAR (Hidden when Favorites Only) */}
      {!showFavoritesOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* DIAGNOSTICS BANNER */}
          <div className="lg:col-span-2 gaming-card p-6 flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">System Diagnostics & Integrity</h3>
                  <span className="text-[11px] text-slate-400 block">
                    Real-time test runner telemetry & AST static ruleset scanner
                  </span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-xs font-mono font-bold">
                SYSTEM HEALTH: 100%
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">Memory Buffer: 14.2 MB / 18.0 MB</span>
                <span className="text-purple-400 font-bold">SSE Event Stream Active</span>
              </div>
              
              <div className="w-full h-3 bg-[#141520] rounded-full overflow-hidden p-0.5 border border-white/10">
                <div className="h-full bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-500 rounded-full w-[78%] shadow-lg shadow-purple-500/50" />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span>Multiplayer Engine Connection Ready</span>
              </div>

              <button 
                onClick={onViewHistory}
                className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold transition-colors"
              >
                VIEW MATCH HISTORY
              </button>
            </div>
          </div>

          {/* ONLINE FRIENDS SIDEBAR */}
          <div className="gaming-card p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-xs font-bold text-slate-300 tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                ONLINE OPERATIVES
              </h2>
              <button 
                onClick={onViewHistory}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase"
              >
                See all
              </button>
            </div>

            <div className="space-y-3">
              {friends.map((f, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-[#141520] border border-white/5 flex items-center justify-between hover:border-purple-500/30 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${f.color} text-white font-black flex items-center justify-center text-xs shadow-md`}>
                        {f.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-[#141520] ${f.isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-100 block leading-tight">{f.name}</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">{f.status}</span>
                    </div>
                  </div>

                  <button 
                    onClick={onNewGame}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-[10px] font-bold transition-colors"
                  >
                    REQUEST
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
