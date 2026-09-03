import React from 'react';
import { ShieldCheck, AlertTriangle, X, CheckCircle, Lock, Cpu, CreditCard, HelpCircle } from 'lucide-react';

interface CodeIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeIntegrityModal: React.FC<CodeIntegrityModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-2xl gaming-card p-6 lg:p-8 space-y-6 shadow-2xl relative border border-purple-500/40 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-purple-600/30 border border-purple-500/50 shadow-md">
            <ShieldCheck className="w-7 h-7 text-purple-300" />
          </div>
          <div>
            <span className="gaming-pill flex items-center gap-1.5 w-fit mb-1">
              <Lock className="w-3 h-3 text-purple-300" /> CODE INTEGRITY & FAIR PLAY CHARTER
            </span>
            <h2 className="text-xl font-black text-white uppercase tracking-wider text-glow-purple">
              Fair Play, Ethics & Compliance Rules
            </h2>
          </div>
        </div>

        {/* Rules Grid */}
        <div className="space-y-3 text-xs">
          
          {/* Rule 1 */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
            <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 shrink-0 mt-0.5">
              <X className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 uppercase tracking-wide">
                No Plagiarism or Uncredited Code
              </h4>
              <p className="text-slate-400 mt-1 leading-relaxed">
                Don't use someone else's work or code without proper credit. Every line committed in Code Mafia is tracked in real-time by the Git Blame engine and AST Sentinel static analyzer.
              </p>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
            <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 shrink-0 mt-0.5">
              <X className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 uppercase tracking-wide">
                No Cheating, Plagiarism, or Unfair Practices
              </h4>
              <p className="text-slate-400 mt-1 leading-relaxed">
                External cheating tools, script injections, or unauthorized automated bots outside the built-in game simulation engine are strictly prohibited.
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
            <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 shrink-0 mt-0.5">
              <X className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 uppercase tracking-wide">
                No Misuse or Damage to Hardware / Venue Equipment
              </h4>
              <p className="text-slate-400 mt-1 leading-relaxed">
                Respect college, venue, and system infrastructure. Do not misuse hardware or cause physical/network disruptions during tournament play.
              </p>
            </div>
          </div>

          {/* Rule 4 */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
            <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 shrink-0 mt-0.5">
              <X className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 uppercase tracking-wide">
                No Interference With Other Teams
              </h4>
              <p className="text-slate-400 mt-1 leading-relaxed">
                Maintain sportsmanlike conduct. Do not disturb, distract, or interfere with competing operative teams during live debugging rounds.
              </p>
            </div>
          </div>

          {/* Rule 5 */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
            <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 shrink-0 mt-0.5">
              <X className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 uppercase tracking-wide">
                No Tampering With Electrical / Network Connections
              </h4>
              <p className="text-slate-400 mt-1 leading-relaxed">
                Do not tamper with electrical equipment, power extension strips, or network switches. Ensure all devices are plugged into safe connections.
              </p>
            </div>
          </div>

          {/* Rule 6 */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
            <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 shrink-0 mt-0.5">
              <X className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 uppercase tracking-wide">
                Strict Adherence to Organizer Instructions
              </h4>
              <p className="text-slate-400 mt-1 leading-relaxed">
                Always follow directives given by tournament judges, organizers, and volunteers. Keep your belongings secure at all times.
              </p>
            </div>
          </div>

          {/* Spike Guard Equipment Note */}
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center space-x-3 text-purple-300">
            <Cpu className="w-5 h-5 text-purple-400 shrink-0" />
            <div className="text-[11px] font-mono leading-relaxed">
              <strong>Equipment Note:</strong> Spike guards and power strips are available at venue helpdesks upon security deposit return policies.
            </div>
          </div>

        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 gaming-btn-purple text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>I Understand & Agree to Code Integrity Rules</span>
        </button>

      </div>
    </div>
  );
};
