import React, { useState } from "react";
import { Plus, Search, MessageSquarePlus, AtSign, Check, CheckCheck } from "lucide-react";
import { Chat, User, Contact, Story } from "../types";
import { NewChatModal } from "../components/NewChatModal";
import { formatKhmerRelativeTime } from "../utils/time";
import { sanitizeAvatarUrl } from "../utils/avatars";

interface ChatListViewProps {
  currentUser: User;
  chats: Chat[];
  contacts: Contact[];
  stories?: Story[];
  onSelectChat: (chat: Chat) => void;
  onStartNewChatWithContact: (contact: Contact) => void;
  onAddNewContact: (name: string, phone: string) => void;
  onDeleteChat: (chatId: string) => void;
  onOpenStory?: (index: number) => void;
  onAddStoryClick?: () => void;
}

export const ChatListView: React.FC<ChatListViewProps> = ({
  currentUser,
  chats,
  contacts,
  stories = [],
  onSelectChat,
  onStartNewChatWithContact,
  onAddNewContact,
  onDeleteChat,
  onOpenStory,
  onAddStoryClick,
}) => {
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter((chat) => {
    const otherUser =
      chat.participants.find((p) => p.id !== currentUser.id) ||
      chat.participants[0];
    const name = chat.name || otherUser?.name || "";
    const username = otherUser?.username || "";
    const lastMsg = chat.lastMessage?.text || "";
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/^@/, "");

    return (
      name.toLowerCase().includes(q) ||
      username.toLowerCase().includes(cleanQ) ||
      lastMsg.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col min-h-full pb-20 max-w-md mx-auto px-3 pt-3 font-sans text-black">
      {/* 1. Header (Compact: 18px Title, 34px Button) */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h1 className="text-[18px] font-bold text-black leading-tight tracking-tight">
            សារ (Chats)
          </h1>
          <p className="text-[11px] text-black font-bold mt-0.5">
            ការជជែក និងទំនាក់ទំនងរបស់អ្នក
          </p>
        </div>
        <button
          onClick={() => setShowNewChatModal(true)}
          className="w-[34px] h-[34px] rounded-xl bg-[#6C63FF] hover:bg-[#5a51e6] text-white flex items-center justify-center shadow-xs active:scale-95 transition-all"
          aria-label="New Chat"
          title="បង្កើតការសន្ទនាថ្មី"
        >
          <Plus className="w-[18px] h-[18px] stroke-[2.5]" />
        </button>
      </div>

      {/* 2. Search Input (Height: 38px, Font: 12px, Radius: 10px) */}
      <div className="mb-2.5">
        <div className="relative">
          <Search className="w-[16px] h-[16px] text-[#111111] font-bold absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកតាមឈ្មោះ, @username ឬសារ..."
            className="w-full h-[38px] bg-[#F5F7FA] border border-transparent focus:border-[#6C63FF]/30 rounded-xl py-2 pl-9 pr-3 text-[12px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#6C63FF]/20 transition-all text-black placeholder:text-[#111111] font-bold"
          />
        </div>
      </div>

      {/* 3. Stories Quick Row */}
      {stories.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]">
              Stories
            </span>
            <span className="text-[10px] text-[#6C63FF] font-bold">
              24 ម៉ោង
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* Add Story Button (Ring: 55px) */}
            <button
              onClick={onAddStoryClick}
              className="flex flex-col items-center flex-shrink-0 group"
            >
              <div className="w-[55px] h-[55px] rounded-full bg-[#F5F7FA] border-2 border-dashed border-[#6C63FF]/40 flex items-center justify-center text-[#6C63FF] font-bold text-base group-hover:bg-[#6C63FF]/10 group-hover:border-[#6C63FF] transition-all">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] text-black font-bold mt-1 truncate max-w-[55px]">
                របស់ខ្ញុំ
              </span>
            </button>

            {/* Existing Stories Circles (Story Ring: 55px, Story Username: 11px) */}
            {stories.map((story, idx) => (
              <button
                key={story.id}
                onClick={() => onOpenStory && onOpenStory(idx)}
                className="flex flex-col items-center flex-shrink-0 group"
              >
                <div className="w-[55px] h-[55px] rounded-full border-2 border-[#6C63FF] p-0.5 group-hover:scale-105 transition-transform shadow-2xs">
                  <img
                    src={sanitizeAvatarUrl(story.userAvatar, story.userName)}
                    alt={story.userName}
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-[11px] text-black font-bold mt-1 truncate max-w-[55px]">
                  {story.userName.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Chat List Section */}
      {chats.length === 0 || (filteredChats.length === 0 && searchQuery) ? (
        <div className="mt-1">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-2xs text-center flex flex-col items-center justify-center">
            <h3 className="text-[13px] font-bold text-black mb-1">
              {searchQuery ? "រកមិនឃើញការសន្ទនា" : "មិនទាន់មានការសន្ទនា"}
            </h3>
            <p className="text-[11px] text-[#111111] font-normal leading-relaxed max-w-xs mb-3">
              {searchQuery
                ? `គ្មានលទ្ធផលសម្រាប់ "${searchQuery}" ទេ`
                : "ចុចប៊ូតុង + ដើម្បីចាប់ផ្តើមជជែកជាមួយមិត្តភក្តិ។"}
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="bg-[#6C63FF] hover:bg-[#5a51e6] text-white text-[13px] font-bold px-4 py-2 rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors active:scale-95"
            >
              <MessageSquarePlus className="w-[16px] h-[16px]" />
              <span>ចាប់ផ្តើមជជែក</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredChats.map((chat) => {
            const otherUser =
              chat.participants.find((p) => p.id !== currentUser.id) ||
              chat.participants[0] ||
              currentUser;
            const displayName = chat.name || otherUser.name;
            const avatar = otherUser.avatar;
            const isOnline = otherUser.isOnline;
            const isAI =
              displayName.toLowerCase().includes("ai") ||
              displayName.toLowerCase().includes("gemini");

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`rounded-xl p-2.5 flex items-center space-x-2.5 cursor-pointer transition-all duration-150 group ${
                  isAI
                    ? "bg-[#6C63FF]/5 border border-[#6C63FF]/20 hover:bg-[#6C63FF]/10 shadow-2xs"
                    : "bg-white hover:bg-gray-50 border border-gray-100 shadow-2xs"
                }`}
              >
                {/* Chat Avatar: 36px Compact */}
                <div className="relative flex-shrink-0">
                  <img
                    src={sanitizeAvatarUrl(avatar, displayName)}
                    alt={displayName}
                    className="w-[36px] h-[36px] rounded-full object-cover border border-gray-100"
                    referrerPolicy="no-referrer"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                {/* Info & Last Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    {/* Chat Name: 13px Compact */}
                    <div className="flex items-center space-x-1 truncate max-w-[200px]">
                      <h4 className="text-[13px] font-bold text-black truncate group-hover:text-[#6C63FF] transition-colors leading-tight">
                        {displayName}
                      </h4>
                      {otherUser.username && (
                        <span className="text-[10px] text-[#111111] font-bold hidden sm:inline truncate">
                          @{otherUser.username}
                        </span>
                      )}
                    </div>

                    {/* Chat Time */}
                    <span className="text-[10px] text-[#111111] font-bold flex-shrink-0 ml-1">
                      {chat.lastMessage?.timestamp
                        ? formatKhmerRelativeTime(chat.lastMessage.timestamp)
                        : "ឥឡូវនេះ"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    {/* Chat Message Preview */}
                    <p
                      className={`text-[11px] truncate max-w-[220px] ${
                        isAI ? "text-[#6C63FF] font-bold" : "text-black font-bold"
                      }`}
                    >
                      {chat.isTyping ? (
                        <span className="text-[#6C63FF] font-bold animate-pulse">
                          កំពុងវាយ...
                        </span>
                      ) : (
                        chat.lastMessage?.text || "ចាប់ផ្តើមការសន្ទនា..."
                      )}
                    </p>

                    {/* Unread Counter Badge */}
                    {chat.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-[#FF6B6B] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs ml-1">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          contacts={contacts}
          currentUser={currentUser}
          onClose={() => setShowNewChatModal(false)}
          onStartChat={onStartNewChatWithContact}
          onAddNewContact={onAddNewContact}
        />
      )}
    </div>
  );
};
