import React, { useState } from 'react';
import { GameSession, Player, AstReport } from '../types/game';
import { FileTree } from '../components/FileTree';
import { CodeEditor } from '../components/CodeEditor';
import { TestRunnerPanel } from '../components/TestRunnerPanel';
import { ActivityFeed } from '../components/ActivityFeed';
import { ChatPanel } from '../components/ChatPanel';
import { GitBlamePanel } from '../components/GitBlamePanel';
import { AstSentinelModal } from '../components/AstSentinelModal';
import { SystemIntegrityGauge } from '../components/SystemIntegrityGauge';
import { PrHotfixPanel } from '../components/PrHotfixPanel';
import { CodeFreezeModal } from '../components/CodeFreezeModal';
import { PhaseTimer } from '../components/PhaseTimer';
import { ArrowRight, ShieldCheck, GitPullRequest, AlertOctagon, HardDrive } from 'lucide-react';

interface WorkRoundPageProps {
  session: GameSession;
  currentUser: Player;
  onCodeChange: (filePath: string, newContent: string) => void;
  onRunTests: () => void;
  isTestRunning: boolean;
  onSendMessage: (text: string, isMafiaOnly?: boolean) => void;
  onAdvanceToDiscussion: () => void;
  onActivateShadowCommit: () => void;
  onTriggerFakeCi: () => void;
  onInjectFlakyTest: () => void;
  onSaveAstReport: (report: AstReport) => void;
  onStagePrHotfix: () => void;
  onActivateMemoryLeak: () => void;
  onActivateSilentRegression: () => void;
  onActivateSyntaxMasking: (target: Player) => void;
  onTriggerCodeFreeze: () => void;
}

export const WorkRoundPage: React.FC<WorkRoundPageProps> = ({
  session,
  currentUser,
  onCodeChange,
  onRunTests,
  isTestRunning,
  onSendMessage,
  onAdvanceToDiscussion,
  onActivateShadowCommit,
  onTriggerFakeCi,
  onInjectFlakyTest,
  onSaveAstReport,
  onStagePrHotfix,
  onActivateMemoryLeak,
  onActivateSilentRegression,
  onActivateSyntaxMasking,
  onTriggerCodeFreeze
}) => {
  const [activeFilePath, setActiveFilePath] = useState(session.activeFilePath);
  const [mobileTab, setMobileTab] = useState<'editor' | 'tests' | 'blame' | 'prs' | 'chat'>('editor');
  const [showAstModal, setShowAstModal] = useState(false);
  const [showCodeFreeze, setShowCodeFreeze] = useState(session.isCodeFrozen);

  const activeFile = session.files.find(f => f.path === activeFilePath) || session.files[0];
  const latestRun = session.testRuns[session.testRuns.length - 1] || null;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#090a0f] overflow-hidden font-sans">
      {/* System Integrity Health Gauge Banner */}
      <div className="p-2 shrink-0">
        <SystemIntegrityGauge
          integrity={session.systemIntegrity}
          isMemoryLeakActive={session.sabotageState.memoryLeakActive}
        />
      </div>

      {/* Work Round Status Header Bar */}
      <div className="h-12 bg-[#12131c] border-y border-white/5 px-4 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center space-x-4">
          <span className="font-mono font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            MISSION CONTROL • ROUND {session.currentRound}
          </span>

          <PhaseTimer
            endsAt={session.phaseEndsAt}
            onTimerExpired={onAdvanceToDiscussion}
            label="WORK TIMER"
          />

          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-mono text-[11px] shadow-sm">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Runtime: {session.contentPack.name} ({session.contentPack.language.toUpperCase()})</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Multiplayer Runtime Sync Active" />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Emergency Code Freeze Button */}
          <button
            onClick={() => {
              onTriggerCodeFreeze();
              setShowCodeFreeze(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/60 font-bold transition-colors shadow-md"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>Call Code Freeze</span>
          </button>

          {/* AST Sentinel Scanner Button */}
          <button
            onClick={() => setShowAstModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-700/60 font-bold transition-colors shadow-md"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">AST Sentinel</span>
          </button>

          {/* Host Advance Button */}
          {currentUser.isHost && (
            <button
              onClick={onAdvanceToDiscussion}
              className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-xl gaming-btn-purple font-bold text-xs shadow-md"
            >
              <span>Discussion</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Split Screen */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* File Tree (Desktop) */}
        <div className="hidden lg:block shrink-0">
          <FileTree
            files={session.files}
            activeFilePath={activeFilePath}
            onSelectFile={setActiveFilePath}
          />
        </div>

        {/* Code Editor */}
        <div className={`flex-1 flex flex-col ${mobileTab === 'editor' ? 'flex' : 'hidden md:flex'}`}>
          <CodeEditor
            file={activeFile}
            onChange={(newContent) => onCodeChange(activeFile.path, newContent)}
            activePlayers={session.players.filter(p => p.isAlive)}
            readOnly={!currentUser.isAlive || session.isCodeFrozen}
          />

          {/* Activity Feed Bar at Bottom of Editor */}
          <ActivityFeed events={session.activityFeed} />
        </div>

        {/* Test Runner Panel */}
        <div className={`${mobileTab === 'tests' ? 'flex w-full' : 'hidden md:flex'} shrink-0`}>
          <TestRunnerPanel
            onRunTests={onRunTests}
            isRunning={isTestRunning}
            latestRun={latestRun}
            testSuite={session.contentPack.testSuite}
            canRun={currentUser.isAlive && !session.isCodeFrozen}
          />
        </div>

        {/* Staged PR Hotfixes Panel */}
        <div className="hidden 2xl:flex shrink-0">
          <PrHotfixPanel
            stagedPrs={session.stagedPrs}
            currentUser={currentUser}
            players={session.players}
            sabotageState={session.sabotageState}
            onStagePr={onStagePrHotfix}
            onActivateMemoryLeak={onActivateMemoryLeak}
            onActivateSilentRegression={onActivateSilentRegression}
            onActivateSyntaxMasking={onActivateSyntaxMasking}
          />
        </div>

        {/* Git Blame Audit Trail Panel */}
        <div className="hidden 2xl:flex shrink-0">
          <GitBlamePanel
            commits={session.gitCommits}
            currentUser={currentUser}
            sabotageState={session.sabotageState}
            onActivateShadowCommit={onActivateShadowCommit}
            onTriggerFakeCi={onTriggerFakeCi}
            onInjectFlakyTest={onInjectFlakyTest}
          />
        </div>

        {/* Chat Panel */}
        <div className={`${mobileTab === 'chat' ? 'flex w-full' : 'hidden xl:flex'} shrink-0`}>
          <ChatPanel
            messages={session.chatMessages}
            currentUser={currentUser}
            onSendMessage={onSendMessage}
          />
        </div>
      </div>

      {/* AST Sentinel Scanner Modal */}
      {showAstModal && (
        <AstSentinelModal
          players={session.players}
          files={session.files}
          currentUser={currentUser}
          onClose={() => setShowAstModal(false)}
          onSaveReport={onSaveAstReport}
        />
      )}

      {/* Code Freeze Incident Review Modal */}
      {(showCodeFreeze || session.isCodeFrozen) && (
        <CodeFreezeModal
          session={session}
          currentUser={currentUser}
          onClose={() => setShowCodeFreeze(false)}
          onAdvanceToVoting={onAdvanceToDiscussion}
        />
      )}
    </div>
  );
};
