import React from 'react';
import { FileCode, Lock, Folder } from 'lucide-react';
import { ContentFile } from '../types/game';

interface FileTreeProps {
  files: ContentFile[];
  activeFilePath: string;
  onSelectFile: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ files, activeFilePath, onSelectFile }) => {
  return (
    <div className="bg-dark-900 border-r border-slate-800 w-64 h-full flex flex-col select-none">
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5 text-cyan-400" />
          Project Files
        </span>
        <span className="text-[10px] text-slate-500 font-mono">{files.length} items</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.map(file => {
          const isActive = file.path === activeFilePath;
          const isPy = file.name.endsWith('.py');
          const isJs = file.name.endsWith('.js');

          return (
            <button
              key={file.path}
              onClick={() => onSelectFile(file.path)}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono flex items-center justify-between transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <FileCode className={`w-4 h-4 shrink-0 ${
                  isPy ? 'text-amber-400' : isJs ? 'text-yellow-400' : 'text-slate-400'
                }`} />
                <span className="truncate">{file.name}</span>
              </div>

              {file.readOnly && (
                <span title="Read Only File"><Lock className="w-3 h-3 text-slate-500 shrink-0" /></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
