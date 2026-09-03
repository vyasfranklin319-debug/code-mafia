import React from 'react';
import { ActivityEvent } from '../types/game';
import { Activity, Edit, Play, Vote, Info } from 'lucide-react';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => {
  return (
    <div className="bg-dark-900 border-t border-slate-800 h-44 flex flex-col select-none">
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Realtime Activity Feed
        </span>
        <span className="text-[10px] text-slate-500 font-mono">Immutable Log ({events.length})</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[11px]">
        {events.slice().reverse().map(act => (
          <div key={act.id} className="flex items-center space-x-2 py-1 px-2 rounded hover:bg-slate-800/40 text-slate-300">
            <span className="text-slate-500 text-[10px] shrink-0">{act.timestamp}</span>

            {act.type === 'EDIT' && <Edit className="w-3 h-3 text-blue-400 shrink-0" />}
            {act.type === 'TEST_RUN' && <Play className="w-3 h-3 text-emerald-400 shrink-0" />}
            {act.type === 'VOTE' && <Vote className="w-3 h-3 text-purple-400 shrink-0" />}
            {act.type === 'SYSTEM' && <Info className="w-3 h-3 text-amber-400 shrink-0" />}

            <span className="font-semibold text-slate-200">{act.playerName}:</span>
            <span className="truncate text-slate-300">{act.details}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
