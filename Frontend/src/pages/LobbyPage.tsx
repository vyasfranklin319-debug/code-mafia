import React, { useState } from 'react';
import { GameSession, Player } from '../types/game';
import { Check, UserPlus, Send, MessageSquare, PlayCircle, Shield, Zap, Sparkles } from 'lucide-react';

interface LobbyPageProps {
  session: GameSession;
  currentUser: Player;
  onToggleReady: () => void;
  onAddBotPlayer: () => void;
  onStartGame: () => void;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({
  session,
  currentUser,
  onToggleReady,
  onAddBotPlayer,
  onStartGame
}) => {
  const [chatInput, setChatInput] = useState('');
  const [lobbyMessages, setLobbyMessages] = useState<{ sender: string; text: string }[]>([]);
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null);

  const isHost = currentUser.isHost;
  const readyCount = session.players.filter(p => p.isReady).length;
  const totalCount = session.players.length;
  const isFull = totalCount >= session.config.playerCount;

  // Auto-start countdown when room capacity is reached (e.g. 6/6 players)
  React.useEffect(() => {
    if (isFull) {
      setAutoStartCountdown(3);
      const timer1 = setTimeout(() => setAutoStartCountdown(2), 1000);
      const timer2 = setTimeout(() => setAutoStartCountdown(1), 2000);
      const timer3 = setTimeout(() => {
        setAutoStartCountdown(0);
        onStartGame();
      }, 3000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setAutoStartCountdown(null);
      return undefined;
    }
  }, [isFull]);


  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setLobbyMessages([...lobbyMessages, { sender: currentUser.displayName, text: chatInput.trim() }]);
    setChatInput('');
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 font-sans text-xs select-none space-y-8">
      {/* 1. TOP MATCH LOBBY HEADER BAR */}
      <div className="gaming-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="gaming-pill flex items-center gap-1.5 w-fit">
              <Zap className="w-3.5 h-3.5 text-purple-300" />
              SESSION ROOM #{session.joinCode}
            </span>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-wider uppercase text-glow-purple">
              OPERATIVE MATCH LOBBY
            </h1>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider block uppercase">
                OPERATIVES READY
              </span>
              <span className="text-2xl font-black text-purple-300 font-mono">
                {readyCount} / {totalCount}
              </span>
            </div>

            {/* START / READY BUTTON */}
            {isHost ? (
              <button
                onClick={onStartGame}
                className="gaming-btn-purple px-8 py-3 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4 fill-current" />
                <span>START ARENA MATCH</span>
              </button>
            ) : (
              <button
                onClick={onToggleReady}
                className={`px-8 py-3 rounded-2xl font-bold text-xs tracking-widest uppercase transition-all ${
                  currentUser.isReady
                    ? 'bg-purple-950/60 border border-purple-500/80 text-purple-300 shadow-md shadow-purple-950/50'
                    : 'gaming-btn-purple'
                }`}
              >
                {currentUser.isReady ? 'READY ●' : 'TOGGLE READY'}
              </button>
            )}
          </div>
        </div>

        {/* Purple Glowing Progress Indicator */}
        <div className="w-full h-2 bg-[#12131c] rounded-full overflow-hidden p-0.5 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full shadow-lg shadow-purple-500/50 transition-all duration-300"
            style={{ width: `${Math.min(100, (readyCount / Math.max(1, totalCount)) * 100)}%` }}
          />
        </div>

        {/* Roster Capacity Status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            ROSTER: {totalCount} / {session.config.playerCount} OPERATIVES
          </span>
          {isFull && (
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider animate-pulse">
              ✓ ROOM FULL — ALL OPERATIVES CONNECTED
            </span>
          )}
        </div>

        {/* Auto-Start Countdown Banner */}
        {autoStartCountdown !== null && autoStartCountdown > 0 && (
          <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-900/80 border border-purple-500/60 text-center animate-pulse shadow-xl shadow-purple-950/50">
            <p className="text-lg font-black text-white uppercase tracking-widest text-glow-purple">
              ⚡ MATCH AUTO-LAUNCHING IN {autoStartCountdown}...
            </p>
            <p className="text-[11px] text-purple-300/90 mt-1">
              All {session.config.playerCount} operative slots filled. Arena deployment initializing.
            </p>
          </div>
        )}
      </div>

      {/* 2. PLAYER ROSTER GRID (6 PLAYER SLOTS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {session.players.map((p) => {
          const initials = p.displayName.slice(0, 2).toUpperCase();

          return (
            <div
              key={p.id}
              className={`p-4 gaming-card flex items-center justify-between transition-all ${
                p.isReady
                  ? 'border-purple-500/50 bg-purple-950/20'
                  : 'opacity-80'
              }`}
            >
              {/* Avatar & Player Info */}
              <div className="flex items-center space-x-4">
                <div className={`w-11 h-11 rounded-2xl ${p.avatarColor || 'bg-purple-600'} text-white font-black flex items-center justify-center text-xs shadow-lg border border-purple-400/40`}>
                  {initials}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-100">{p.displayName}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-purple-500/40 text-purple-300 bg-purple-950/40 uppercase">
                      {p.isHost ? 'ROOM HOST' : 'OPERATIVE'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      CONNECTED
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div>
                {p.isReady ? (
                  <span className="text-xs font-black text-purple-300 tracking-wider uppercase px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/50">
                    READY
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                    NOT READY
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Host Action Controls */}
      {isHost && session.players.length < session.config.playerCount && (
        <div className="flex justify-end pt-1">
          <button
            onClick={onAddBotPlayer}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300 font-bold text-xs transition-colors uppercase flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-purple-400" />
            <span>Add AI Operative Slot</span>
          </button>
        </div>
      )}

      {/* 3. LOBBY CHAT STREAM */}
      <div className="gaming-card p-6 space-y-4">
        <span className="text-xs font-bold text-slate-300 tracking-wider uppercase block flex items-center gap-2 border-b border-white/10 pb-3">
          <MessageSquare className="w-4 h-4 text-purple-400" /> OPERATIVE LOBBY CHAT
        </span>

        {/* Chat Feed */}
        <div className="space-y-2 max-h-36 overflow-y-auto font-sans text-xs">
          {lobbyMessages.map((msg, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span className={`font-bold ${
                msg.sender === currentUser.displayName
                  ? 'text-purple-400 font-extrabold'
                  : 'text-slate-300'
              }`}>
                {msg.sender}
              </span>
              <span className="text-slate-500">→</span>
              <span className="text-slate-300">{msg.text}</span>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendChat} className="flex space-x-3 pt-3 border-t border-white/10">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Type lobby chat message..."
            className="flex-1 gaming-input px-4 py-2 text-xs"
          />
          <button
            type="submit"
            className="gaming-btn-purple px-6 py-2 rounded-xl font-bold text-xs tracking-wider uppercase flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>SEND</span>
          </button>
        </form>
      </div>
    </div>
  );
};
