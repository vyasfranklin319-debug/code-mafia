import React from 'react';
import { ContentFile, Player } from '../types/game';
import { Edit3, Lock, FileCode } from 'lucide-react';

interface CodeEditorProps {
  file: ContentFile;
  onChange: (newContent: string) => void;
  activePlayers: Player[];
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  onChange,
  activePlayers,
  readOnly = false
}) => {
  const isFileReadOnly = readOnly || file.readOnly;
  const lines = file.currentContent.split('\n');

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0D1117] border-r border-slate-800 relative select-none">
      {/* Editor Header Tab Bar */}
      <div className="h-10 bg-[#161B22] border-b border-slate-800 px-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-slate-200 font-medium">{file.name}</span>
          {isFileReadOnly ? (
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] flex items-center gap-1">
              <Lock className="w-3 h-3" /> READ ONLY
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 text-[10px] flex items-center gap-1 border border-blue-900/50">
              <Edit3 className="w-3 h-3" /> EDITABLE
            </span>
          )}
        </div>

        {/* Presence Indicators (Co-editors) */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-500 font-mono hidden md:inline">ACTIVE CO-EDITORS:</span>
          <div className="flex -space-x-1.5 overflow-hidden">
            {activePlayers.slice(0, 4).map(p => (
              <div
                key={p.id}
                title={`${p.displayName} is viewing this file`}
                className={`w-5 h-5 rounded-full ${p.avatarColor} text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-dark-900 uppercase`}
              >
                {p.displayName.charAt(0)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Main Body */}
      <div className="flex-1 relative flex overflow-hidden font-mono text-xs">
        {/* Line Numbers Gutter */}
        <div className="w-12 bg-[#161B22]/60 py-3 text-right pr-3 select-none text-slate-600 border-r border-slate-800/60 leading-6 shrink-0">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Interactive Textarea Code Editor */}
        <div className="flex-1 relative h-full">
          <textarea
            value={file.currentContent}
            onChange={(e) => !isFileReadOnly && onChange(e.target.value)}
            disabled={isFileReadOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            className="w-full h-full bg-transparent text-slate-100 p-3 leading-6 font-mono resize-none focus:outline-none selection:bg-blue-600/40 tab-size-2"
            style={{
              fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
              fontSize: '13px',
              lineHeight: '24px',
              tabSize: 2
            }}
          />
        </div>
      </div>
    </div>
  );
};
