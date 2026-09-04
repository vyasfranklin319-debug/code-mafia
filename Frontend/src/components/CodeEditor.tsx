import React, { useRef, useEffect } from 'react';
import { ContentFile, Player } from '../types/game';
import { Edit3, Lock, FileCode } from 'lucide-react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface CodeEditorProps {
  file: ContentFile;
  onChange: (newContent: string) => void;
  activePlayers: Player[];
  readOnly?: boolean;
  roomCode: string;
  currentUser: Player;
}

const getYjsUrl = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  if (host === 'localhost' || host === '127.0.0.1') {
    return (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:3001';
  }
  return 'wss://code-mafia-api.codemafia.workers.dev';
};

// Cache Yjs docs per file to avoid re-creating them
const ydocCache = new Map<string, { ydoc: Y.Doc; provider: WebsocketProvider }>();

function getOrCreateYjsDoc(roomCode: string, filePath: string) {
  const key = `${roomCode}-${filePath}`;
  if (!ydocCache.has(key)) {
    const ydoc = new Y.Doc();
    const wsUrl = getYjsUrl();
    const provider = new WebsocketProvider(wsUrl, `code-mafia-${key}`, ydoc);
    ydocCache.set(key, { ydoc, provider });
  }
  return ydocCache.get(key)!;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  onChange,
  activePlayers,
  readOnly = false,
  roomCode,
  currentUser
}) => {
  const isFileReadOnly = readOnly || file.readOnly;
  const editorRef = useRef<any>(null);
  const suppressChangeRef = useRef(false);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    const { ydoc, provider } = getOrCreateYjsDoc(roomCode, file.path);
    const ytext = ydoc.getText('monaco');

    // Set user awareness
    provider.awareness.setLocalStateField('user', {
      name: currentUser.displayName,
      color: '#7c3aed',
    });

    // Initialize content from Yjs if empty
    if (ytext.length === 0 && file.currentContent) {
      ydoc.transact(() => {
        ytext.insert(0, file.currentContent);
      });
    }

    // Sync Yjs -> Monaco
    const yjsObserver = () => {
      const model = editor.getModel();
      if (!model) return;
      const yjsText = ytext.toString();
      const monacoText = model.getValue();
      if (yjsText !== monacoText) {
        suppressChangeRef.current = true;
        const pos = editor.getPosition();
        model.setValue(yjsText);
        if (pos) editor.setPosition(pos);
        suppressChangeRef.current = false;
      }
    };
    ytext.observe(yjsObserver);

    // Sync Monaco -> Yjs
    editor.onDidChangeModelContent(() => {
      if (suppressChangeRef.current || isFileReadOnly) return;
      const model = editor.getModel();
      if (!model) return;
      const monacoText = model.getValue();
      const yjsText = ytext.toString();
      if (monacoText !== yjsText) {
        ydoc.transact(() => {
          ytext.delete(0, ytext.length);
          ytext.insert(0, monacoText);
        });
      }
      onChange(monacoText);
    });
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0D1117] border-r border-slate-800 relative">
      {/* Editor Header Tab Bar */}
      <div className="h-10 bg-[#161B22] border-b border-slate-800 px-4 flex items-center justify-between text-xs shrink-0">
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
                className={`w-5 h-5 rounded-full ${p.avatarColor} text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-[#0D1117] uppercase`}
              >
                {p.displayName.charAt(0)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative overflow-hidden">
        <Editor
          key={file.path}
          height="100%"
          defaultLanguage={
            file.path?.endsWith('.ts') || file.path?.endsWith('.tsx')
              ? 'typescript'
              : file.path?.endsWith('.py')
              ? 'python'
              : file.path?.endsWith('.java')
              ? 'java'
              : 'javascript'
          }
          theme="vs-dark"
          defaultValue={file.currentContent}
          options={{
            readOnly: isFileReadOnly,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
            lineHeight: 24,
            tabSize: 2,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            automaticLayout: true,
            padding: { top: 12 },
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
};
