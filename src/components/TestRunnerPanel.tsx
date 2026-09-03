import React from 'react';
import { TestRunResult, TestCase } from '../types/game';
import { Play, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface TestRunnerPanelProps {
  onRunTests: () => void;
  isRunning: boolean;
  latestRun: TestRunResult | null;
  testSuite: TestCase[];
  canRun: boolean;
}

export const TestRunnerPanel: React.FC<TestRunnerPanelProps> = ({
  onRunTests,
  isRunning,
  latestRun,
  testSuite,
  canRun
}) => {
  const currentTests = latestRun ? latestRun.tests : testSuite;
  const passedCount = latestRun ? latestRun.passedCount : 0;
  const totalCount = testSuite.length;
  const passPercentage = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-dark-900 border-t md:border-t-0 md:border-l border-slate-800 w-full md:w-80 h-full flex flex-col">
      {/* Header & Run Button */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Automated Test Runner</h3>
          <span className="text-[10px] text-slate-400 font-mono">Isolated Sandbox</span>
        </div>

        <button
          onClick={onRunTests}
          disabled={isRunning || !canRun}
          className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all ${
            isRunning || !canRun
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/30 hover:scale-105 active:scale-95'
          }`}
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Tests</span>
            </>
          )}
        </button>
      </div>

      {/* Progress & Pass Meter */}
      <div className="p-3 border-b border-slate-800 bg-dark-950/60">
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className="text-slate-400">PASSED METRIC:</span>
          <span className={`font-bold ${passPercentage === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {passedCount} / {totalCount} ({passPercentage}%)
          </span>
        </div>

        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-[1px]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              passPercentage === 100 ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
            }`}
            style={{ width: `${passPercentage}%` }}
          />
        </div>

        {latestRun && (
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-2">
            <span>Last run by: {latestRun.triggeredByPlayerName}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {latestRun.durationMs}ms
            </span>
          </div>
        )}
      </div>

      {/* Test Cases List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {currentTests.map(test => {
          const status = test.status || 'PENDING';

          return (
            <div
              key={test.id}
              className={`p-2.5 rounded-lg border text-xs transition-all ${
                status === 'PASS'
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                  : status === 'FAIL'
                  ? 'bg-red-950/40 border-red-800/50 text-red-300'
                  : status === 'ERROR'
                  ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                  : 'bg-dark-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-2">
                  {status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                  {status === 'FAIL' && <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                  {status === 'ERROR' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                  {status === 'PENDING' && <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0 mt-0.5" />}

                  <div>
                    <span className="font-semibold font-mono block text-slate-200">{test.name}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{test.description}</span>
                  </div>
                </div>

                {test.durationMs !== undefined && (
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">{test.durationMs}ms</span>
                )}
              </div>

              {/* Error Excerpt */}
              {test.errorMessage && (
                <div className="mt-2 p-2 rounded bg-black/50 font-mono text-[10px] text-red-300 border border-red-900/40 whitespace-pre-wrap break-all">
                  {test.errorMessage}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
