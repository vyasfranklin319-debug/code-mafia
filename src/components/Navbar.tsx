import React, { useState } from 'react';
import { GameSession, Player } from '../types/game';
import { 
  Settings, Hexagon, Gamepad2, Star, Trophy, Package, 
  Search, Mic, Bell, LogOut, Shield, Zap, Sparkles, BarChart3, TrendingUp 
} from 'lucide-react';

interface NavbarProps {
  session: GameSession | null;
  currentUser: Player | null;
  onLeaveGame: () => void;
  onNavigateHome: () => void;
  onNavigateLobby?: () => void;
  onNavigateModes?: () => void;
  onNavigateFavorites?: () => void;
  onNavigateJourney?: () => void;
  onNavigateHistory?: () => void;
  onNavigateAdminPacks?: () => void;
  onNavigateLogin?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  currentUser,
  onLeaveGame,
  onNavigateHome,
  onNavigateLobby,
  onNavigateModes,
  onNavigateFavorites,
  onNavigateJourney,
  onNavigateHistory,
  onNavigateAdminPacks,
  onNavigateLogin,
  theme,
  onToggleTheme
}) => {
  const [activeTab, setActiveTab] = useState<'HOME' | 'LOBBY' | 'SETTINGS' | 'STAR' | 'HISTORY' | 'ADMIN'>('HOME');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-full flex flex-col font-sans text-xs select-none sticky top-0 z-40 bg-[#090a0f]/90 backdrop-blur-xl border-b border-white/5">
      {/* 1. TOP GAMING LAUNCHER NAVIGATION BAR */}
      <header className="h-16 px-6 flex items-center justify-between gap-6">
        {/* Left: Brand + Nav Icon Tab Bar */}
        <div className="flex items-center space-x-6">
          {/* Logo */}
          <div 
            onClick={() => { setActiveTab('HOME'); onNavigateHome(); }}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 p-[1px] shadow-lg shadow-purple-950/60 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0d0e14] rounded-[11px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400 fill-current" />
              </div>
            </div>
            <div>
              <span className="font-black text-sm tracking-wider text-white block">
                CODE MAFIA
              </span>
              <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest block -mt-1">
                NEXUS HUB
              </span>
            </div>
          </div>

          {/* Icon Tabs Strip */}
          <nav className="hidden lg:flex items-center space-x-1.5 bg-[#12131c] border border-white/5 p-1 rounded-2xl">
            {/* Settings Tab -> Config Wizard */}
            <button 
              onClick={() => { setActiveTab('SETTINGS'); if (onNavigateModes) onNavigateModes(); }}
              className={`p-2.5 rounded-xl transition-all ${
                activeTab === 'SETTINGS' 
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-950/50' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Match Settings & Config Wizard"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Hexagon Shield -> Lobby */}
            <button 
              onClick={() => { setActiveTab('LOBBY'); if (onNavigateLobby) onNavigateLobby(); }}
              className={`p-2.5 rounded-xl transition-all ${
                activeTab === 'LOBBY' 
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-950/50' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Lobby Arena"
            >
              <Hexagon className="w-4 h-4" />
            </button>

            {/* Controller Icon -> Home Dashboard */}
            <button 
              onClick={() => { setActiveTab('HOME'); onNavigateHome(); }}
              className={`p-2.5 rounded-xl transition-all ${
                activeTab === 'HOME'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Home Launch Pad"
            >
              <Gamepad2 className="w-4 h-4" />
            </button>

            {/* Star Icon -> Favorites & Featured Game Modes Only */}
            <button 
              onClick={() => { setActiveTab('STAR'); if (onNavigateFavorites) onNavigateFavorites(); else if (onNavigateModes) onNavigateModes(); }}
              className={`p-2.5 rounded-xl transition-all ${
                activeTab === 'STAR'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Favorites & Featured Game Modes Only"
            >
              <Star className={`w-4 h-4 ${activeTab === 'STAR' ? 'text-purple-300 fill-current' : ''}`} />
            </button>

            {/* Trophy Icon -> History & Leaderboard */}
            <button 
              onClick={() => { setActiveTab('HISTORY'); if (onNavigateHistory) onNavigateHistory(); }}
              className={`p-2.5 rounded-xl transition-all ${
                activeTab === 'HISTORY'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Leaderboard & Match History"
            >
              <Trophy className="w-4 h-4 text-purple-300" />
            </button>

            {/* Package Store Icon -> Admin Content Packs */}
            <button 
              onClick={() => { setActiveTab('ADMIN'); if (onNavigateAdminPacks) onNavigateAdminPacks(); }}
              className={`p-2.5 rounded-xl transition-all ${
                activeTab === 'ADMIN'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Admin Content Packs Manager"
            >
              <Package className="w-4 h-4" />
            </button>
          </nav>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-xs relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search match, pack, operative..."
            className="w-full pl-9 pr-8 py-2 bg-[#12131c] border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 transition-all"
          />
          <span className="absolute right-2.5 px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-slate-400 font-mono">
            /
          </span>
        </div>

        {/* Right: Developer Journey Dashboard + Notifications + User Profile Pill */}
        <div className="flex items-center space-x-3">
          {/* Developer Journey Dashboard Button */}
          <button 
            onClick={() => { if (onNavigateJourney) onNavigateJourney(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/40 hover:text-white transition-all shadow-md"
            title="Developer Journey & Analytics Dashboard"
          >
            <BarChart3 className="w-4 h-4 text-purple-300" />
            <span className="font-bold text-xs uppercase hidden xl:inline">Journey Dashboard</span>
          </button>

          {/* Notifications & History */}
          <button 
            onClick={() => { if (onNavigateHistory) onNavigateHistory(); }}
            className="hidden sm:flex p-2.5 rounded-xl bg-[#12131c] border border-white/10 text-slate-300 hover:text-white hover:border-purple-500/40 transition-colors relative"
            title="Notifications & History"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-purple-500 absolute top-2 right-2 animate-ping" />
          </button>

          {/* User Profile Pill Card (Click to open Auth Login Page) */}
          <div 
            onClick={() => { if (onNavigateLogin) onNavigateLogin(); }}
            className="flex items-center space-x-3 bg-[#12131c] hover:bg-white/5 cursor-pointer border border-white/10 px-3 py-1.5 rounded-2xl shadow-inner transition-all group"
            title="Log in to Operative Account"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black flex items-center justify-center text-xs shadow-md border border-purple-400/40 group-hover:scale-105 transition-transform">
                {currentUser ? currentUser.displayName.slice(0, 2).toUpperCase() : 'VR'}
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -bottom-0.5 -right-0.5 ring-2 ring-[#12131c]" />
            </div>

            <div className="text-left hidden sm:block">
              <span className="font-bold text-xs text-slate-100 block tracking-wide leading-none group-hover:text-purple-300 transition-colors">
                {currentUser ? currentUser.displayName : 'VoidRunner_X'}
              </span>
              <span className="text-[9px] text-purple-400 font-bold tracking-wider uppercase block mt-0.5">
                {currentUser?.role ? currentUser.role : 'LOG IN / PROFILE'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. SUB-HEADER TICKER / MATCH STATUS BAR */}
      <div className="h-7 bg-[#0d0e14] border-t border-white/5 px-6 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <div className="flex items-center space-x-6">
          <span className="flex items-center gap-1.5 text-purple-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            ENGINE: ONLINE
          </span>
          <span className="hidden sm:inline">REGION: NA-EAST</span>
          <span className="hidden md:inline">MATCHMAKING: INSTANT</span>
          <span className="text-slate-300 font-bold">ACTIVE OPERATIVES: 12,480</span>
        </div>

        {session && (
          <div className="flex items-center space-x-4">
            <span className="text-purple-300 font-bold bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-md font-mono">
              ROOM: {session.joinCode}
            </span>
            <button 
              onClick={onLeaveGame}
              className="text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 font-bold"
            >
              <LogOut className="w-3 h-3" /> LEAVE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
