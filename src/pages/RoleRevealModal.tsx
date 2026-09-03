import React from 'react';
import { Player } from '../types/game';
import { Shield, Skull, CheckCircle, ShieldCheck, Zap } from 'lucide-react';

interface RoleRevealModalProps {
  currentUser: Player;
  allPlayers: Player[];
  onAcknowledge: () => void;
}

export const RoleRevealModal: React.FC<RoleRevealModalProps> = ({
  currentUser,
  allPlayers,
  onAcknowledge
}) => {
  const isMafia = currentUser.role === 'MAFIA';
  const isInspector = currentUser.role === 'INSPECTOR';
  const mafiaTeammates = allPlayers.filter(p => p.role === 'MAFIA');

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 select-none font-sans">
      <div className={`w-full max-w-lg rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300 border ${
        isMafia 
          ? 'bg-gradient-to-b from-red-950/90 via-[#101118] to-black/90 border-red-500/50 shadow-red-950/50' 
          : 'gaming-card-hero'
      }`}>
        {/* Role Icon & Title */}
        <div className="space-y-3">
          <div className="inline-flex p-4 rounded-2xl bg-black/40 border border-white/10 shadow-xl">
            {isMafia ? (
              <Skull className="w-16 h-16 text-red-500 animate-pulse text-glow-red" />
            ) : isInspector ? (
              <ShieldCheck className="w-16 h-16 text-purple-300 text-glow-purple" />
            ) : (
              <Shield className="w-16 h-16 text-purple-400 text-glow-purple" />
            )}
          </div>

          <span className="text-xs font-mono uppercase tracking-widest text-purple-300 block">
            SECRET OPERATIVE ROLE ASSIGNMENT
          </span>

          <h2 className={`text-3xl font-black tracking-tight ${
            isMafia ? 'text-red-500 text-glow-red' : 'text-white text-glow-purple'
          }`}>
            YOU ARE {isMafia ? 'MAFIA' : isInspector ? 'SECURITY INSPECTOR' : 'A DEVELOPER'}
          </h2>
        </div>

        {/* Role Description */}
        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          {isMafia ? (
            'Your objective is to covertly introduce bugs, alter priority logic, and prevent tests from passing — while deflecting suspicion during discussion and voting rounds!'
          ) : isInspector ? (
            'Your objective is to run AST Static Analysis scans on player edits to audit code complexity and detect infinite loops or disguised bugs!'
          ) : (
            'Your objective is to collaborate with teammates, debug the flawed codebase, pass 100% of unit tests, and vote out the hidden Mafia saboteurs!'
          )}
        </p>

        {/* Mafia Teammate Reveal (Secret for Mafia only) */}
        {isMafia && (
          <div className="bg-red-950/40 border border-red-800/60 p-4 rounded-2xl space-y-2 text-left">
            <span className="text-xs font-mono font-bold text-red-400 uppercase block">
              FELLOW MAFIA TEAMMATES ({mafiaTeammates.length}):
            </span>
            <div className="space-y-1">
              {mafiaTeammates.map(m => (
                <div key={m.id} className="text-xs font-sans text-slate-200 flex items-center gap-2">
                  <Skull className="w-3.5 h-3.5 text-red-500" />
                  <span className="font-bold">{m.displayName}</span>
                  {m.id === currentUser.id && <span className="text-slate-400 text-[10px]">(You)</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onAcknowledge}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 ${
            isMafia
              ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-white shadow-red-950'
              : 'gaming-btn-purple'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>I Understand My Role — Begin Round 1</span>
        </button>
      </div>
    </div>
  );
};
