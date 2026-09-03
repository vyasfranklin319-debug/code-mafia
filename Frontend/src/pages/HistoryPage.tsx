import React, { useState, useEffect } from 'react';
import { GameHistoryItem } from '../types/game';
import { History, Download, ArrowLeft, Search, Trophy, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface HistoryPageProps {
  onBack: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onBack }) => {
  const [historyItems, setHistoryItems] = useState<GameHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real match history from backend API, Cloud Firestore & localStorage
  const fetchRealHistory = async () => {
    setIsLoading(true);
    let items: GameHistoryItem[] = [];
    try {
      const res = await fetch('http://localhost:3001/api/v1/history');
      if (res.ok) {
        items = await res.json();
      }
    } catch (e) {
      console.warn('Backend API offline, attempting Firestore query.');
    }

    // Query Cloud Firestore matchHistory collection if API is empty
    if (items.length === 0) {
      try {
        const { fetchMatchHistoryFromFirestore } = await import('../services/firebaseStore');
        const fsRecords = await fetchMatchHistoryFromFirestore();
        if (fsRecords.length > 0) {
          items = fsRecords as any;
        }
      } catch (e) {
        // Fallback to local storage
      }
    }

    // Fallback to local storage if empty
    if (items.length === 0) {
      const localData = localStorage.getItem('code_mafia_match_history');
      if (localData) {
        try {
          items = JSON.parse(localData);
        } catch (e) {
          items = [];
        }
      }
    }

    setHistoryItems(items);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRealHistory();
  }, []);

  const filtered = historyItems.filter(h =>
    h.packName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.winner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (historyItems.length === 0) {
      alert('No recorded matches available to export.');
      return;
    }
    const headers = ['ID,Date,ContentPack,Language,Players,Mafia,Winner,DurationMin,Rounds'];
    const rows = historyItems.map(h =>
      `${h.id},${h.date},"${h.packName}",${h.language},${h.playerCount},${h.mafiaCount},${h.winner},${h.durationMinutes},${h.roundsCount}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `code_mafia_real_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6 select-none font-sans">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Arena Hub
      </button>

      <div className="gaming-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="gaming-pill flex items-center gap-1.5 w-fit mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            LIVE TELEMETRY & RECORDED MATCHES
          </span>
          <h1 className="text-2xl font-black text-white tracking-wider uppercase text-glow-purple flex items-center gap-2">
            <History className="w-6 h-6 text-purple-400" /> Real Match History & Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time archive of completed multiplayer Code Mafia sessions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchRealHistory}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Refresh Real History"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={historyItems.length === 0}
            className="gaming-btn-purple px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Export CSV Report
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
        <input
          type="text"
          placeholder="Search real match history by pack, language, or victor..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 gaming-input text-xs"
        />
      </div>

      {/* Table */}
      <div className="gaming-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-mono">
            Loading real telemetry matches...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <History className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-300 uppercase">No Matches Recorded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Play and complete a multiplayer match in the Arena to automatically log real telemetry metrics into this archive.
            </p>
          </div>
        ) : (
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase">
                <th className="py-4 px-6 font-bold">Date & Time</th>
                <th className="py-4 px-6 font-bold">Content Pack</th>
                <th className="py-4 px-6 font-bold">Operatives</th>
                <th className="py-4 px-6 font-bold">Victor</th>
                <th className="py-4 px-6 font-bold">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">{item.date}</td>
                  <td className="py-4 px-6 font-black text-slate-100">{item.packName}</td>
                  <td className="py-4 px-6">{item.playerCount} Operatives ({item.mafiaCount} Saboteurs)</td>
                  <td className="py-4 px-6">
                    {item.winner === 'DEVELOPERS' ? (
                      <span className="px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 font-bold flex items-center gap-1.5 w-fit text-[10px]">
                        <Trophy className="w-3 h-3 text-purple-300" /> DEVS
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-red-950/80 text-red-400 border border-red-800/60 font-bold flex items-center gap-1.5 w-fit text-[10px]">
                        <ShieldAlert className="w-3 h-3 text-red-400" /> MAFIA
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">{item.durationMinutes}m ({item.roundsCount} rounds)</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
