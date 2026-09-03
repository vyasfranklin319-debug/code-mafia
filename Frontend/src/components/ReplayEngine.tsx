import React, { useState, useEffect } from 'react';
import { GameSession, ReplayFrame } from '../types/game';
import { Play, Pause, FastForward, RotateCcw, GitCommit as GitIcon, MessageSquare, Terminal, Zap } from 'lucide-react';

interface ReplayEngineProps {
  session: GameSession;
}

export const ReplayEngine: React.FC<ReplayEngineProps> = ({ session }) => {
  const frames = session.replayFrames || [];
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);

  // Auto-play timer effect
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const intervalMs = Math.round(1000 / speed);
    const timer = setInterval(() => {
      setCurrentFrameIndex(prev => {
        if (prev >= frames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, frames.length]);

  if (frames.length === 0) {
    return (
      <div className="p-8 text-center bg-dark-800 border border-slate-800 rounded-2xl font-mono text-xs text-slate-400">
        No replay keyframe telemetry recorded for this match session.
      </div>
    );
  }

  const activeFrame: ReplayFrame = frames[currentFrameIndex] || frames[0];
  const progressPercent = Math.round(((currentFrameIndex + 1) / frames.length) * 100);

  return (
    <div className="bg-dark-800/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl font-mono text-xs select-none">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-cyan-400" /> POST-MORTEM REPLAY ENGINE
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Scrub through exact match timelines to inspect code edits, test runs, and Mafia sabotage.
          </p>
        </div>

        {/* Playback Controls & Speed Toggle */}
        <div className="flex items-center space-x-2 bg-dark-950 p-1.5 rounded-xl border border-slate-700/80">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            title={isPlaying ? 'Pause Playback' : 'Start Playback'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => { setCurrentFrameIndex(0); setIsPlaying(false); }}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
            title="Reset to Start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[10px]">
            {[1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded ${speed === s ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Scrubber Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-bold text-cyan-400">{activeFrame.timestampLabel} ({activeFrame.phase})</span>
          <span className="text-slate-400">Step {currentFrameIndex + 1} of {frames.length} ({progressPercent}%)</span>
        </div>

        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={currentFrameIndex}
          onChange={e => { setCurrentFrameIndex(Number(e.target.value)); setIsPlaying(false); }}
          className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      {/* Synchronized Replay View (Code + Telemetry Stream) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-80">
        {/* Code Content at Keyframe */}
        <div className="lg:col-span-2 bg-[#0D1117] border border-slate-800 rounded-xl p-4 flex flex-col overflow-hidden">
          <div className="text-[10px] text-slate-500 border-b border-slate-800 pb-2 mb-2 flex items-center justify-between font-mono">
            <span>SNAPSHOT CODE CONTENT AT KEYFRAME</span>
            <span className="text-cyan-400">{activeFrame.eventSummary}</span>
          </div>
          <pre className="flex-1 overflow-auto text-slate-200 text-xs leading-5 font-mono p-2 bg-[#161B22]/60 rounded border border-slate-800/80">
            {activeFrame.activeFileContent || '// Empty code file at start of session'}
          </pre>
        </div>

        {/* Telemetry Event Stream at Keyframe */}
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3 font-mono text-xs">
          <span className="font-bold text-slate-200 border-b border-slate-800 pb-2">KEYFRAME METRICS</span>
          
          <div className="space-y-2 text-[11px]">
            <div className="p-2 rounded bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5"><GitIcon className="w-3.5 h-3.5 text-cyan-400" /> Commits:</span>
              <span className="font-bold text-white">{activeFrame.gitCommitsCount}</span>
            </div>

            <div className="p-2 rounded bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Chat Logs:</span>
              <span className="font-bold text-white">{activeFrame.chatMessagesCount}</span>
            </div>

            {activeFrame.latestCommit && (
              <div className="p-2 rounded bg-blue-950/40 border border-blue-800/60 space-y-1">
                <span className="text-[10px] text-blue-400 font-bold block">LATEST COMMIT SHA:</span>
                <p className="text-slate-200 text-[10px] truncate">{activeFrame.latestCommit.hash} - @{activeFrame.latestCommit.authorName}</p>
              </div>
            )}

            {activeFrame.testRunResult && (
              <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/60 space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold block">TEST RUN RESULT:</span>
                <p className="text-slate-200 text-[10px]">{activeFrame.testRunResult.passedCount} Passed / {activeFrame.testRunResult.totalCount} Total</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
