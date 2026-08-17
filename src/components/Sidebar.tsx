import React from "react";
import { AIChatSession } from "../services/aiChat.service";
import { Plus, Trash2, MessageSquare, X } from "lucide-react";

interface SidebarProps {
  chats: AIChatSession[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onClearAll,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full z-20 absolute md:relative shadow-sm">
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={onNewChat}
          className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] text-white py-2 px-3 rounded-xl text-sm font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-all active:scale-95"
        >
          <span>✨ New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">
            មិនទាន់មានប្រវត្តិសន្ទនា
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                currentChatId === chat.id
                  ? "bg-[#6C63FF]/10 text-[#6C63FF] font-bold border border-[#6C63FF]/20"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{chat.title || "New Chat"}</p>
                  <p className="text-[10px] text-gray-400">
                    {chat.updatedAt?.toDate?.().toLocaleString() || "Just now"}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => onDeleteChat(chat.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 rounded-md transition-opacity"
                title="លុប Chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {chats.length > 0 && (
        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClearAll}
            className="w-full text-red-500 text-xs py-1.5 px-3 hover:bg-red-50 rounded-lg font-semibold flex items-center justify-center space-x-1 transition-all"
          >
            <span>🗑️ Clear All History</span>
          </button>
        </div>
      )}
    </div>
  );
};
