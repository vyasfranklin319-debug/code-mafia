import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, Award, Zap, Activity, TrendingUp, ShieldCheck, Flame, 
  BarChart3, CheckCircle2, AlertTriangle, ArrowLeft, Star, Users, 
  Clock, ShieldAlert, Cpu, Sparkles, Filter, ChevronRight, User, KeyRound,
  FileCode, Crosshair, Target, LineChart, PieChart, Layers, GitPullRequest, Code2
} from 'lucide-react';
import { getPlayerDeveloperJourney, getGlobalLeaderboard, RANK_DEFINITIONS } from '../services/journeyEngine';
import { DetailedGameAnalyticsItem, PlayerDeveloperJourney } from '../types/journey';
import { fetchMatchHistoryFromFirestore, fetchJourneyDataFromFirestore, saveJourneyDataToFirestore } from '../services/firebaseStore';

interface DeveloperJourneyDashboardProps {
  onBack: () => void;
}

export const DeveloperJourneyDashboard: React.FC<DeveloperJourneyDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'journey' | 'game-analytics' | 'coding-skills' | 'debugging' | 
    'testing' | 'collaboration' | 'rank-progress' | 'leaderboard' | 'achievements' | 'game-history' | 'profile'
  >('overview');

  const [timeFilter, setTimeFilter] = useState<'5_games' | '10_games' | '30_days' | 'all_time'>('all_time');
  const [leaderboardCategory, setLeaderboardCategory] = useState<'overall' | 'coding' | 'debugging' | 'testing' | 'collaboration' | 'winrate' | 'xp'>('overall');
  const [selectedGameDetail, setSelectedGameDetail] = useState<DetailedGameAnalyticsItem | null>(null);

  // Active Operative Username
  const activeUserName = localStorage.getItem('code_mafia_active_user') || 'OperativeUser';

  // Live Cloud Firestore Journey State
  const [liveJourney, setLiveJourney] = useState<PlayerDeveloperJourney>(() => 
    getPlayerDeveloperJourney(activeUserName)
  );

  // Sync live match history and analytics insights with Cloud Firestore
  useEffect(() => {
    const syncFirestoreJourney = async () => {
      try {
        let historyRecords: any[] = [];
        const fsHistory = await fetchMatchHistoryFromFirestore();
        if (fsHistory && fsHistory.length > 0) {
          historyRecords = fsHistory;
        }

        if (historyRecords.length > 0) {
          const computed = getPlayerDeveloperJourney(activeUserName, historyRecords);
          setLiveJourney(computed);
          // Persist insights to Cloud Firestore
          await saveJourneyDataToFirestore(activeUserName, computed);
        } else {
          // Check if saved journey analytics exist in Firestore
          const savedJourney = await fetchJourneyDataFromFirestore(activeUserName);
          if (savedJourney && savedJourney.rankInfo) {
            setLiveJourney(savedJourney as PlayerDeveloperJourney);
          }
        }
      } catch (e) {}
    };
    syncFirestoreJourney();
  }, [activeUserName]);

  const journey = liveJourney;
  const leaderboard = useMemo(() => getGlobalLeaderboard(), []);

  const rankInfo = journey.rankInfo;
  const currentRank = rankInfo.currentRank;

  // Filtered Game History
  const filteredHistory = useMemo(() => {
    if (timeFilter === '5_games') return journey.gameHistory.slice(0, 5);
    if (timeFilter === '10_games') return journey.gameHistory.slice(0, 10);
    return journey.gameHistory;
  }, [journey.gameHistory, timeFilter]);

  // SVG Radar Polygon calculations
  const radar = journey.debugging.radar;
  const radarPoints = useMemo(() => {
    const axes = [radar.debugging, radar.logic, radar.problemSolving, radar.speed, radar.accuracy, radar.testing];
    const center = 100;
    const maxRadius = 75;
    
    return axes.map((val, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const radius = (val / 100) * maxRadius;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  }, [radar]);

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans flex flex-col select-none">
      
      {/* 1. TOP HEADER & PROMINENT RANK BAR */}
      <header className="bg-[#10111a] border-b border-white/10 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-xl backdrop-blur-xl">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/40 transition-all"
            title="Back to Launch Pad"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="gaming-pill flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" /> DEVELOPER JOURNEY ANALYTICS
              </span>
            </div>
            <h1 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>Code Mafia Journey Dashboard</span>
            </h1>
          </div>
        </div>

        {/* PROMINENT RANK & XP DISPLAY */}
        <div className="flex items-center space-x-4 bg-[#161726] border border-purple-500/40 p-3 rounded-2xl shadow-lg">
          <div className="text-3xl p-2 rounded-xl bg-purple-950/80 border border-purple-700/60 shadow-inner">
            {currentRank.badgeIcon}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold font-mono">
              <span className="text-amber-300 uppercase tracking-widest text-sm">{currentRank.name}</span>
              <span className="text-purple-300 ml-3">{rankInfo.currentXp} XP</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-48 sm:w-64 h-2.5 bg-[#090a0f] rounded-full overflow-hidden p-0.5 border border-white/10 relative">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-500 shadow-md shadow-purple-500/50" 
                style={{ width: `${rankInfo.progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{rankInfo.progressPercent}% Progress to {rankInfo.nextRank ? rankInfo.nextRank.name : 'MAX RANK'}</span>
              <span>{rankInfo.requiredXp} XP Req</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN LAYOUT: SIDEBAR + CONTENT AREA */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 lg:p-6 gap-6">
        
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="w-full lg:w-64 bg-[#10111a] border border-white/10 rounded-3xl p-4 space-y-1 shrink-0 h-fit">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest px-3 block mb-2">
            ANALYTICS MODULES
          </span>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
              { id: 'journey', label: 'My Journey', icon: TrendingUp },
              { id: 'game-analytics', label: 'Game Analytics', icon: LineChart },
              { id: 'coding-skills', label: 'Coding Skills', icon: FileCode },
              { id: 'debugging', label: 'Debugging', icon: Crosshair },
              { id: 'testing', label: 'Testing & Quality', icon: ShieldCheck },
              { id: 'collaboration', label: 'Collaboration', icon: Users },
              { id: 'rank-progress', label: 'Rank Progress', icon: Trophy },
              { id: 'leaderboard', label: 'Leaderboard', icon: Award },
              { id: 'achievements', label: 'Achievements', icon: Star },
              { id: 'game-history', label: 'Game History', icon: Activity },
              { id: 'profile', label: 'Player Profile', icon: User },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/60 border border-purple-400/40' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* RIGHT MAIN ANALYTICS VIEW */}
        <main className="flex-1 space-y-6">

          {/* TIME FILTER & CONTROLS */}
          <div className="gaming-card p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
              <Filter className="w-4 h-4 text-purple-400" />
              <span>Timeframe Filter:</span>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              {[
                { id: '5_games', label: 'Last 5 Games' },
                { id: '10_games', label: 'Last 10 Games' },
                { id: '30_days', label: 'Last 30 Days' },
                { id: 'all_time', label: 'All Time' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setTimeFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold transition-all ${
                    timeFilter === f.id
                      ? 'bg-purple-600 text-white border border-purple-400/50 shadow-md'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ================================================== */}
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {/* ================================================== */}
          {(activeTab === 'overview' || activeTab === 'journey') && (
            <div className="space-y-6">
              
              {/* TOP METRICS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="gaming-card p-4 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Games</span>
                  <div className="text-2xl font-black text-white font-mono">{journey.gamePerformance.totalGames}</div>
                  <span className="text-[10px] text-purple-400 font-bold">{journey.gamePerformance.wins} Wins / {journey.gamePerformance.losses} Losses</span>
                </div>

                <div className="gaming-card p-4 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Win Rate</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">{journey.gamePerformance.winRatePercent}%</div>
                  <span className="text-[10px] text-slate-400">Streak: {journey.progression.currentWinStreak} (Best: {journey.progression.bestWinStreak})</span>
                </div>

                <div className="gaming-card p-4 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Bugs Fixed</span>
                  <div className="text-2xl font-black text-purple-300 font-mono">{journey.debugging.bugsFixed}</div>
                  <span className="text-[10px] text-slate-400">{journey.debugging.bugsDetected} Detected</span>
                </div>

                <div className="gaming-card p-4 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Overall Score</span>
                  <div className="text-2xl font-black text-amber-300 font-mono">{journey.overallPerformanceScore} / 100</div>
                  <span className="text-[10px] text-emerald-400 font-bold">{journey.gamePerformance.totalGames > 0 ? 'Active Operative' : 'Unranked Operative'}</span>
                </div>
              </div>

              {/* FACTOR A & B: SKILL GROWTH LINE CHART + RADAR CHART */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* FACTOR A: CODING SKILL GROWTH LINE GRAPH */}
                <div className="gaming-card p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" /> Developer Skill Growth Over Time
                    </h3>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      +{journey.codingGrowth.currentSkillScore - journey.codingGrowth.startingSkillScore} PTS (+{journey.codingGrowth.codeComplexityImprovement}%)
                    </span>
                  </div>

                  {/* SVG Line Graph */}
                  <div className="h-48 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-4 bg-[#131420] rounded-2xl border border-white/5 relative">
                    <div className="absolute top-2 left-3 text-[10px] font-mono text-slate-400">
                      Starting: <strong className="text-slate-200">{journey.codingGrowth.startingSkillScore}</strong> → Current: <strong className="text-purple-300">{journey.codingGrowth.currentSkillScore}</strong>
                    </div>

                    {journey.codingGrowth.growthTimeline.map((pt, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] font-mono text-purple-300 font-bold opacity-80 group-hover:opacity-100">
                          {pt.skillScore}
                        </span>
                        <div 
                          className="w-full max-w-[28px] bg-gradient-to-t from-purple-700 to-indigo-500 rounded-t-lg transition-all group-hover:bg-purple-400 shadow-md shadow-purple-950/60"
                          style={{ height: `${(pt.skillScore / 100) * 120}px` }}
                        />
                        <span className="text-[9px] font-mono text-slate-400">{pt.date}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FACTOR B: RADAR CHART (DEBUGGING & PROBLEM SOLVING) */}
                <div className="gaming-card p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-purple-400" /> Skill Factor Radar Analysis
                    </h3>
                    <span className="text-xs font-mono font-bold text-purple-300">
                      {journey.gamePerformance.totalGames > 0 ? '86%' : '0%'} Accuracy
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* SVG Radar Polygon */}
                    <div className="relative w-48 h-48 shrink-0">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {[0.25, 0.5, 0.75, 1].map((r, idx) => (
                          <circle key={idx} cx="100" cy="100" r={75 * r} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="2,2" />
                        ))}
                        <polygon points={radarPoints} fill="rgba(168, 85, 247, 0.35)" stroke="#a855f7" strokeWidth="2" />
                      </svg>
                    </div>

                    <div className="space-y-2 w-full text-xs font-mono">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-400">Debugging:</span>
                        <span className="text-purple-300 font-bold">{radar.debugging}%</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-400">Logic & AST:</span>
                        <span className="text-purple-300 font-bold">{radar.logic}%</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-400">Problem Solving:</span>
                        <span className="text-purple-300 font-bold">{radar.problemSolving}%</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-400">Speed & Duration:</span>
                        <span className="text-purple-300 font-bold">{radar.speed}%</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-400">Testing & Coverage:</span>
                        <span className="text-purple-300 font-bold">{radar.testing}%</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================================================== */}
          {/* TAB: CODING SKILLS (DEDICATED FULL PAGE ANALYTICS) */}
          {/* ================================================== */}
          {activeTab === 'coding-skills' && (
            <div className="space-y-6">
              <div className="gaming-card p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-purple-400" /> Factor A: Coding Skill Growth Analytics
                    </h3>
                    <p className="text-xs text-slate-400">Telemetry tracking coding accuracy, development speed, and AST complexity improvement</p>
                  </div>
                  <span className="gaming-pill font-mono">{journey.codingGrowth.codingAccuracyPercent}% ACCURACY</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Coding Accuracy</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">{journey.codingGrowth.codingAccuracyPercent}%</div>
                    <span className="text-[10px] text-slate-400">High precision edits</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Build Success Rate</span>
                    <div className="text-2xl font-black text-purple-300 font-mono">{journey.codingGrowth.buildSuccessRatePercent}%</div>
                    <span className="text-[10px] text-slate-400">{journey.codingGrowth.successfulSubmissions} Submissions</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Complexity Gain</span>
                    <div className="text-2xl font-black text-amber-300 font-mono">+{journey.codingGrowth.codeComplexityImprovement}%</div>
                    <span className="text-[10px] text-slate-400">AST Refactoring</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Dev Speed Rating</span>
                    <div className="text-2xl font-black text-white font-mono">{journey.codingGrowth.developmentSpeedScore}/100</div>
                    <span className="text-[10px] text-purple-400 font-bold">Fast patch velocity</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Language & Stack Proficiency</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-2">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-purple-300">JavaScript / Node.js</span>
                        <span>{journey.gamePerformance.totalGames > 0 ? 94 : 0}% Proficiency</span>
                      </div>
                      <div className="w-full h-2.5 bg-black rounded-full overflow-hidden p-0.5 border border-white/10">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${journey.gamePerformance.totalGames > 0 ? 94 : 0}%` }} />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-2">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-indigo-300">Python 3.11</span>
                        <span>{journey.gamePerformance.totalGames > 0 ? 88 : 0}% Proficiency</span>
                      </div>
                      <div className="w-full h-2.5 bg-black rounded-full overflow-hidden p-0.5 border border-white/10">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${journey.gamePerformance.totalGames > 0 ? 88 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB: DEBUGGING (DEDICATED FULL PAGE ANALYTICS) */}
          {/* ================================================== */}
          {activeTab === 'debugging' && (
            <div className="space-y-6">
              <div className="gaming-card p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2">
                      <Crosshair className="w-5 h-5 text-purple-400" /> Factor B: Debugging & Problem Solving
                    </h3>
                    <p className="text-xs text-slate-400">Detailed metrics on bug detection, resolution duration, and first-attempt fix rate</p>
                  </div>
                  <span className="gaming-pill font-mono">{journey.debugging.bugsFixed} BUGS FIXED</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Bugs Fixed</span>
                    <div className="text-2xl font-black text-purple-300 font-mono">{journey.debugging.bugsFixed}</div>
                    <span className="text-[10px] text-slate-400">Out of {journey.debugging.bugsDetected} detected</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Avg Debug Time</span>
                    <div className="text-2xl font-black text-amber-300 font-mono">{journey.debugging.avgDebuggingTimeSeconds}s</div>
                    <span className="text-[10px] text-slate-400">Per bug fix</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">First Attempt Fix</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">{journey.debugging.firstAttemptFixRatePercent}%</div>
                    <span className="text-[10px] text-slate-400">Clean patches</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Difficult Solves</span>
                    <div className="text-2xl font-black text-white font-mono">{journey.debugging.difficultBugsSolved}</div>
                    <span className="text-[10px] text-purple-400 font-bold">Hard tier bugs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB: TESTING & QUALITY (DEDICATED FULL PAGE ANALYTICS) */}
          {/* ================================================== */}
          {activeTab === 'testing' && (
            <div className="space-y-6">
              <div className="gaming-card p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-purple-400" /> Factor C: Testing & Code Quality Analytics
                    </h3>
                    <p className="text-xs text-slate-400">Test pass rates, test suite coverage, and AST Sentinel quality scores</p>
                  </div>
                  <span className="gaming-pill font-mono">{journey.testingQuality.codeQualityScore}/100 QUALITY</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Tests Passed</span>
                    <div className="text-2xl font-black text-purple-300 font-mono">{journey.testingQuality.testsPassed}</div>
                    <span className="text-[10px] text-slate-400">Across all matches</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Test Coverage</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">{journey.testingQuality.testCoveragePercent}%</div>
                    <span className="text-[10px] text-slate-400">Suite assertion depth</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Clean Code Score</span>
                    <div className="text-2xl font-black text-amber-300 font-mono">{journey.testingQuality.cleanCodeScore}/100</div>
                    <span className="text-[10px] text-slate-400">AST audit</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Regression Rate</span>
                    <div className="text-2xl font-black text-slate-200 font-mono">{journey.testingQuality.regressionRatePercent}%</div>
                    <span className="text-[10px] text-emerald-400 font-bold">Very low regressions</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB: COLLABORATION (DEDICATED FULL PAGE ANALYTICS) */}
          {/* ================================================== */}
          {activeTab === 'collaboration' && (
            <div className="space-y-6">
              <div className="gaming-card p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" /> Factor D: Team Collaboration & Synergy
                    </h3>
                    <p className="text-xs text-slate-400">PR hotfixes merged, code reviews conducted, and helpful team contributions</p>
                  </div>
                  <span className="gaming-pill font-mono">{journey.collaboration.collaborationScore}/100 SCORE</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Merges Approved</span>
                    <div className="text-2xl font-black text-purple-300 font-mono">{journey.collaboration.successfulMergesCount}</div>
                    <span className="text-[10px] text-slate-400">Staged PR Hotfixes</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Code Reviews</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">{journey.collaboration.codeReviewsCount}</div>
                    <span className="text-[10px] text-slate-400">Audits completed</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Helpful Edits</span>
                    <div className="text-2xl font-black text-amber-300 font-mono">{journey.collaboration.helpfulContributionsCount}</div>
                    <span className="text-[10px] text-slate-400">Peer assisted</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12131c] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Objectives Done</span>
                    <div className="text-2xl font-black text-white font-mono">{journey.collaboration.teamObjectivesCompletedCount}</div>
                    <span className="text-[10px] text-purple-400 font-bold">Team targets</span>
                  </div>
                </div>

                {/* Contribution Log */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Recent Team Contribution Log</h4>
                  <div className="space-y-2">
                    {journey.collaboration.timeline.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#12131c] border border-white/5 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center space-x-3">
                          <span className="text-purple-400 font-bold">{item.date}</span>
                          <span className="text-slate-200 font-bold">{item.contributionType}</span>
                        </div>
                        <span className="text-emerald-400 font-bold">+{item.scoreGained} PTS</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 2 & 8: RANK PROGRESSION & RANKING SYSTEM */}
          {/* ================================================== */}
          {(activeTab === 'rank-progress' || activeTab === 'journey') && (
            <div className="gaming-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" /> Competitive Ranking System & Tiers
                  </h3>
                  <p className="text-xs text-slate-400">All competitive tiers from Bronze I to Grandmaster</p>
                </div>
                <span className="gaming-pill font-mono">{rankInfo.currentXp} TOTAL XP</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {RANK_DEFINITIONS.map((r, idx) => {
                  const isCurrent = r.name === currentRank.name;
                  const isUnlocked = rankInfo.currentXp >= r.minXp;
                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-2xl border text-center space-y-1 transition-all ${
                        isCurrent 
                          ? 'bg-gradient-to-b from-purple-900/80 to-indigo-950 border-purple-400 ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/80 scale-105' 
                          : isUnlocked 
                          ? 'bg-white/5 border-white/10 text-slate-200' 
                          : 'bg-black/40 border-white/5 text-slate-600 opacity-50'
                      }`}
                    >
                      <div className="text-2xl">{r.badgeIcon}</div>
                      <span className="font-bold text-xs block text-white">{r.name}</span>
                      <span className="text-[9px] font-mono text-slate-400 block">{r.minXp} XP</span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold text-amber-300 uppercase block font-mono">CURRENT RANK</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Rank Progression Milestone History</h4>
                <div className="space-y-2">
                  {journey.journeyTimeline.map((tl, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#12131c] border border-white/5 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center space-x-3">
                        <span className="text-purple-400 font-bold">{tl.date}</span>
                        <span className="text-white font-bold">{tl.milestoneTitle}</span>
                        <span className="text-slate-400 text-[11px]">{tl.detail}</span>
                      </div>
                      {tl.rankAchieved && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60 font-bold text-[10px]">
                          {tl.rankAchieved}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 8: GLOBAL LEADERBOARD */}
          {/* ================================================== */}
          {activeTab === 'leaderboard' && (
            <div className="gaming-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" /> Global Operative Leaderboard
                  </h3>
                  <p className="text-xs text-slate-400">Competitive ranking evaluated securely without exposing secret roles</p>
                </div>

                <div className="flex flex-wrap gap-1 bg-[#12131c] p-1 rounded-xl border border-white/10 text-xs font-mono">
                  {['overall', 'coding', 'debugging', 'testing', 'collaboration', 'winrate', 'xp'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setLeaderboardCategory(cat as any)}
                      className={`px-3 py-1 rounded-lg uppercase font-bold transition-all ${
                        leaderboardCategory === cat ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase font-mono">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Operative</th>
                      <th className="py-3 px-4">Competitive Tier</th>
                      <th className="py-3 px-4">Total XP</th>
                      <th className="py-3 px-4">Win Rate</th>
                      <th className="py-3 px-4">Coding Score</th>
                      <th className="py-3 px-4">Debugging</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {leaderboard.map(op => {
                      const isMe = op.playerId === 'p-me';
                      return (
                        <tr key={op.playerId} className={`hover:bg-white/5 transition-colors ${isMe ? 'bg-purple-950/40 font-bold border-l-2 border-purple-400' : ''}`}>
                          <td className="py-3.5 px-4 font-mono font-bold">#{op.rankPosition}</td>
                          <td className="py-3.5 px-4 font-bold flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl ${op.avatarColor} text-white font-black flex items-center justify-center text-xs shadow-sm`}>
                              {op.playerName.charAt(0)}
                            </div>
                            <span>{op.playerName}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-amber-300">
                              {op.tier}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-300">{op.xp} XP</td>
                          <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{op.winRatePercent}%</td>
                          <td className="py-3.5 px-4 font-mono">{op.codingScore}</td>
                          <td className="py-3.5 px-4 font-mono">{op.debuggingScore}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 10: ACHIEVEMENTS BADGES */}
          {/* ================================================== */}
          {activeTab === 'achievements' && (
            <div className="gaming-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" /> Operative Achievement Badges
                  </h3>
                  <p className="text-xs text-slate-400">Unlock achievements by fixing bugs, passing test runs, and ranking up</p>
                </div>
                <span className="gaming-pill font-mono">{journey.achievements.filter(a => a.isUnlocked).length} / {journey.achievements.length} UNLOCKED</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {journey.achievements.map(a => (
                  <div 
                    key={a.id}
                    className={`p-4 rounded-2xl border space-y-2 transition-all ${
                      a.isUnlocked 
                        ? 'bg-gradient-to-br from-purple-950/60 to-indigo-950/40 border-purple-500/40 shadow-lg' 
                        : 'bg-black/40 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{a.icon}</span>
                      <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                        a.isUnlocked ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {a.isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-white">{a.name}</h4>
                      <p className="text-xs text-slate-400 leading-snug mt-0.5">{a.description}</p>
                    </div>

                    <div className="pt-2 text-[10px] font-mono text-slate-400 flex justify-between">
                      <span>Progress: {a.currentProgress} / {a.maxProgress}</span>
                      {a.unlockedAtDate && <span className="text-purple-300">{a.unlockedAtDate}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 5 & 11: GAME HISTORY TABLE */}
          {/* ================================================== */}
          {(activeTab === 'game-history' || activeTab === 'game-analytics') && (
            <div className="gaming-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" /> Detailed Game History Analytics
                  </h3>
                  <p className="text-xs text-slate-400">Click any recorded game to inspect full telemetry metrics</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase font-mono">
                      <th className="py-3 px-4">Match ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">Content Pack</th>
                      <th className="py-3 px-4">Bugs Fixed</th>
                      <th className="py-3 px-4">Tests Passed</th>
                      <th className="py-3 px-4">XP Gained</th>
                      <th className="py-3 px-4">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {filteredHistory.map(g => (
                      <tr key={g.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedGameDetail(g)}>
                        <td className="py-3.5 px-4 font-mono font-bold text-purple-300">{g.gameCode}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{g.date}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            g.result === 'VICTORY' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60' : 'bg-red-950/80 text-red-400 border border-red-800/60'
                          }`}>
                            {g.result}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-100">{g.packName}</td>
                        <td className="py-3.5 px-4 font-mono">{g.bugsFixed}</td>
                        <td className="py-3.5 px-4 font-mono">{g.testsPassed}</td>
                        <td className="py-3.5 px-4 font-mono text-amber-300 font-bold">+{g.xpGained} XP</td>
                        <td className="py-3.5 px-4">
                          <button className="px-3 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase">
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 9: PLAYER PROFILE */}
          {/* ================================================== */}
          {activeTab === 'profile' && (
            <div className="gaming-card p-6 space-y-6">
              <div className="flex items-center space-x-6 border-b border-white/10 pb-6">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black flex items-center justify-center text-2xl shadow-xl border-2 border-purple-400/40">
                  {journey.playerName.slice(0, 2).toUpperCase()}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-black text-white">{journey.playerName}</h2>
                    <span className="px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60 font-bold text-xs font-mono">
                      {currentRank.name} ({currentRank.badgeIcon})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">Operative ID: {journey.playerId} • Account Verified</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px]">TOTAL GAMES</span>
                  <span className="text-xl font-bold text-white">{journey.gamePerformance.totalGames}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px]">WIN RATE</span>
                  <span className="text-xl font-bold text-emerald-400">{journey.gamePerformance.winRatePercent}%</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px]">BEST STREAK</span>
                  <span className="text-xl font-bold text-purple-300">{journey.progression.bestWinStreak} Games</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px]">TOTAL XP</span>
                  <span className="text-xl font-bold text-amber-300">{journey.rankInfo.currentXp} XP</span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* GAME DETAIL ANALYTICS MODAL */}
      {selectedGameDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="gaming-card p-6 max-w-lg w-full space-y-4 relative border border-purple-500/50">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-base text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" /> Match Telemetry Details ({selectedGameDetail.gameCode})
              </h3>
              <button onClick={() => setSelectedGameDetail(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Content Pack:</span>
                <span className="text-white font-bold">{selectedGameDetail.packName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Result:</span>
                <span className={selectedGameDetail.result === 'VICTORY' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{selectedGameDetail.result}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Bugs Fixed / Detected:</span>
                <span className="text-purple-300 font-bold">{selectedGameDetail.bugsFixed} / {selectedGameDetail.bugsDetected}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Tests Passed:</span>
                <span className="text-purple-300 font-bold">{selectedGameDetail.testsPassed}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Code Quality Score:</span>
                <span className="text-amber-300 font-bold">{selectedGameDetail.codeQualityScore}/100</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">XP Reward Earned:</span>
                <span className="text-emerald-400 font-bold">+{selectedGameDetail.xpGained} XP</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedGameDetail(null)}
              className="w-full py-2.5 gaming-btn-purple text-xs font-xs font-bold uppercase tracking-wider"
            >
              Close Telemetry Modal
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
