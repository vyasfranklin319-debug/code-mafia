import React, { useState } from 'react';
import { ChatMessage, Player } from '../types/game';
import { MessageSquare, Send, ShieldAlert } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUser: Player | null;
  onSendMessage: (text: string, isMafiaOnly?: boolean) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, currentUser, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const [isMafiaChannel, setIsMafiaChannel] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), isMafiaChannel);
    setInputText('');
  };

  const isMafia = currentUser?.role === 'MAFIA';

  return (
    <div className="bg-dark-900 border-l border-slate-800 w-full md:w-80 h-full flex flex-col">
      {/* Header & Channel Switcher */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Discussion Chat</span>
        </div>

        {isMafia && (
          <div className="flex bg-dark-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setIsMafiaChannel(false)}
              className={`px-2 py-0.5 rounded ${!isMafiaChannel ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              Public
            </button>
            <button
              onClick={() => setIsMafiaChannel(true)}
              className={`px-2 py-0.5 rounded flex items-center gap-1 ${isMafiaChannel ? 'bg-red-900 text-red-200 font-bold' : 'text-red-400'}`}
            >
              <ShieldAlert className="w-3 h-3" /> Mafia
            </button>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs">
        {messages.map(msg => {
          const isMe = currentUser && msg.senderId === currentUser.id;
          const isSystem = msg.isSystem;

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center my-2 text-[10px] text-amber-400/90 italic bg-amber-950/20 py-1 px-2 rounded border border-amber-900/30">
                {msg.text}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center space-x-1 mb-0.5 text-[10px] text-slate-400">
                <span className="font-semibold text-slate-300">{msg.senderName}</span>
                <span>• {msg.timestamp}</span>
              </div>

              <div
                className={`p-2 rounded-lg max-w-[85%] break-words ${
                  msg.isMafiaOnly
                    ? 'bg-red-950/80 text-red-200 border border-red-800/60 shadow-sm shadow-red-950'
                    : isMe
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-slate-800 bg-dark-950 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={isMafiaChannel ? 'Secret Mafia Chat...' : 'Discuss clues & edits...'}
          className="flex-1 bg-dark-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
