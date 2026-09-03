import React, { useState } from 'react';
import { Player, AstReport, ContentFile } from '../types/game';
import { scanCodeAst } from '../services/astScanner';
import { ShieldCheck, Search, AlertTriangle, AlertCircle, Info, Cpu, CheckCircle2, X } from 'lucide-react';

interface AstSentinelModalProps {
  players: Player[];
  files: ContentFile[];
  currentUser: Player;
  onClose: () => void;
  onSaveReport: (report: AstReport) => void;
}

export const AstSentinelModal: React.FC<AstSentinelModalProps> = ({
  players,
  files,
  currentUser,
  onClose,
  onSaveReport
}) => {
  const alivePlayers = players.filter(p => p.isAlive);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(alivePlayers[0]?.id || '');
  const [activeReport, setActiveReport] = useState<AstReport | null>(null);

  const primaryFile = files.find(f => !f.readOnly) || files[0];

  const handleRunScan = () => {
    const targetPlayer = alivePlayers.find(p => p.id === selectedTargetId) || alivePlayers[0];
    if (!targetPlayer || !primaryFile) return;

    const report = scanCodeAst(targetPlayer, primaryFile.path, primaryFile.currentContent);
    setActiveReport(report);
    onSaveReport(report);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-mono flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-[#161B22] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-slate-100 text-sm">AST STATIC ANALYSIS SENTINEL</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Target Selection Bar */}
          <div className="bg-dark-800 border border-slate-800 p-4 rounded-xl space-y-3">
            <label className="text-xs text-slate-400 block font-semibold">SELECT TARGET PLAYER TO AUDIT:</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedTargetId}
                onChange={e => setSelectedTargetId(e.target.value)}
                className="flex-1 bg-dark-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {alivePlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} {p.id === currentUser.id ? '(You)' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={handleRunScan}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <Search className="w-4 h-4" />
                <span>Run AST Scan</span>
              </button>
            </div>
          </div>

          {/* AST Report Output */}
          {activeReport ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Complexity Score Card */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block">CYCLOMATIC COMPLEXITY RATING</span>
                  <div className="text-2xl font-extrabold text-slate-100 flex items-center gap-2 mt-1">
                    <Cpu className="w-5 h-5 text-cyan-400" />
                    <span>{activeReport.complexityScore} / 100</span>
                  </div>
                </div>

                <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                  activeReport.complexityScore > 60
                    ? 'bg-red-950 text-red-400 border-red-800'
                    : activeReport.complexityScore > 35
                    ? 'bg-amber-950 text-amber-400 border-amber-800'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                }`}>
                  {activeReport.complexityScore > 60 ? 'HIGH COMPLEXITY' : activeReport.complexityScore > 35 ? 'MODERATE RISK' : 'LOW RISK'}
                </div>
              </div>

              {/* AST Findings List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block">AST CODE SMELLS & RULE VIOLATIONS ({activeReport.findings.length}):</span>
                {activeReport.findings.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No suspicious AST anomalies or infinite loop constructs detected in target's branch!</span>
                  </div>
                ) : (
                  activeReport.findings.map(f => (
                    <div
                      key={f.id}
                      className={`p-3 rounded-xl border space-y-1 text-xs ${
                        f.severity === 'HIGH'
                          ? 'bg-red-950/40 border-red-800/80 text-red-200'
                          : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span className="flex items-center gap-1.5">
                          {f.severity === 'HIGH' ? <AlertCircle className="w-3.5 h-3.5 text-red-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{f.rule}</span>
                        </span>
                        <span className="text-slate-400 text-[10px]">LINE {f.line}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">{f.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-slate-500 text-xs">
              <Info className="w-8 h-8 mx-auto text-slate-600" />
              <p>Select a player above and click "Run AST Scan" to analyze code complexity and inspect suspicious imports or loops.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
