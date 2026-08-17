import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Phone,
  Video,
  Paperclip,
  Send,
  Trash2,
  CornerUpLeft,
  Check,
  CheckCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Chat, Message, User } from "../types";
import { StorageService } from "../services/storage";
import { GeminiService } from "../services/gemini";

interface ChatDetailViewProps {
  chat: Chat;
  currentUser: User;
  onBack: () => void;
}

const EMOJI_LIST = ["❤️", "👍", "😂", "😮", "😢", "🙏", "🔥", "🥰"];

export const ChatDetailView: React.FC<ChatDetailViewProps> = ({
  chat,
  currentUser,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [callModal, setCallModal] = useState<"audio" | "video" | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherUser =
    chat.participants.find((p) => p.id !== currentUser.id) ||
    chat.participants[0] ||
    currentUser;

  useEffect(() => {
    const loaded = StorageService.getMessages(chat.id);
    setMessages(loaded);
    scrollToBottom();
    loadSmartReplies(loaded);
  }, [chat.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const loadSmartReplies = async (currentMessages: Message[]) => {
    if (currentMessages.length === 0) return;
    const lastMsg = currentMessages[currentMessages.length - 1];
    if (lastMsg.senderId !== currentUser.id) {
      setIsLoadingReplies(true);
      const suggestions = await GeminiService.getSmartReplies(lastMsg.text);
      setSmartReplies(suggestions);
      setIsLoadingReplies(false);
    } else {
      setSmartReplies([]);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const content = textToSend || inputText;
    if (!content.trim() && !selectedImage) return;

    const newMessage: Message = {
      id: "msg_" + Date.now(),
      chatId: chat.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: content.trim(),
      imageUrl: selectedImage || undefined,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            text: replyingTo.text,
            senderName: replyingTo.senderName,
          }
        : undefined,
      reactions: {},
    };

    const updated = [...messages, newMessage];
    setMessages(updated);
    StorageService.saveMessages(chat.id, updated);

    const chats = StorageService.getChats();
    const chatIndex = chats.findIndex((c) => c.id === chat.id);
    if (chatIndex !== -1) {
      chats[chatIndex].lastMessage = newMessage;
      chats[chatIndex].updatedAt = new Date().toISOString();
      StorageService.saveChats(chats);
    }

    setInputText("");
    setSelectedImage(null);
    setReplyingTo(null);
    setSmartReplies([]);
    scrollToBottom();

    triggerFriendReply(content);
  };

  const triggerFriendReply = (userMessage: string) => {
    setIsTyping(true);
    setTimeout(async () => {
      let replyText = "បាទបង! ខ្ញុំបានទទួលសារហើយ ចាំបន្តិចណា៎ 🤗";
      
      try {
        const aiPrompt = `You are roleplaying as a friendly Cambodian friend named "${otherUser.name}" chatting with "${currentUser.name}" on Hugi messenger app.
"${currentUser.name}" just sent: "${userMessage}".
Reply in 1 or 2 short, natural, friendly sentences in Khmer (ភាសាខ្មែរ). Include an emoji.`;
        const res = await GeminiService.chatWithAI(aiPrompt);
        if (res && res.length < 150) {
          replyText = res;
        }
      } catch {
        replyText = "ចាស/បាទបង Makara! យល់ព្រមតាមហ្នឹងណា៎ ✨";
      }

      setIsTyping(false);

      const friendMsg: Message = {
        id: "msg_friend_" + Date.now(),
        chatId: chat.id,
        senderId: otherUser.id,
        senderName: otherUser.name,
        senderAvatar: otherUser.avatar,
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "delivered",
        reactions: {},
      };

      setMessages((prev) => {
        const next = [...prev, friendMsg];
        StorageService.saveMessages(chat.id, next);
        loadSmartReplies(next);
        return next;
      });

      const chats = StorageService.getChats();
      const chatIndex = chats.findIndex((c) => c.id === chat.id);
      if (chatIndex !== -1) {
        chats[chatIndex].lastMessage = friendMsg;
        chats[chatIndex].updatedAt = new Date().toISOString();
        StorageService.saveChats(chats);
      }

      scrollToBottom();
    }, 1800);
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) => {
      const next = prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...m.reactions };
        const userList = currentReactions[emoji] || [];

        if (userList.includes(currentUser.id)) {
          currentReactions[emoji] = userList.filter((id) => id !== currentUser.id);
          if (currentReactions[emoji].length === 0) {
            delete currentReactions[emoji];
          }
        } else {
          currentReactions[emoji] = [...userList, currentUser.id];
        }

        return { ...m, reactions: currentReactions };
      });

      StorageService.saveMessages(chat.id, next);
      return next;
    });

    setActiveMessageId(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== messageId);
      StorageService.saveMessages(chat.id, next);
      return next;
    });
    setActiveMessageId(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F7FA] max-w-md mx-auto flex flex-col h-screen font-sans text-[#2D3436]">
      {/* Top Bar Height: 48px Compact */}
      <header className="h-[48px] bg-white border-b border-gray-100 flex items-center justify-between px-3 z-10 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-gray-500 hover:text-[#6C63FF] hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>

          {/* Chat Avatar: 36px Compact */}
          <div className="relative">
            <img
              src={
                otherUser.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.name}`
              }
              alt={otherUser.name}
              className="w-[36px] h-[36px] rounded-full object-cover border border-gray-100"
            />
            {otherUser.isOnline && (
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-white rounded-full"></span>
            )}
          </div>

          <div>
            {/* Chat Name: 13px Compact */}
            <h2 className="font-bold text-[13px] text-gray-800 truncate max-w-[150px] leading-tight">
              {otherUser.name}
            </h2>
            <div className="text-[10px] leading-none mt-0.5">
              {isTyping ? (
                <span className="text-[#6C63FF] font-medium animate-pulse">
                  កំពុងវាយ...
                </span>
              ) : otherUser.isOnline ? (
                <p className="text-green-500 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Active Now
                </p>
              ) : (
                <span className="text-gray-400">Offline</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons (Icon: 18px) */}
        <div className="flex gap-1 text-gray-400">
          <button
            onClick={() => setCallModal("audio")}
            className="p-1.5 hover:bg-gray-100 hover:text-[#6C63FF] rounded-full transition-colors"
            title="Audio Call"
          >
            <Phone className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => setCallModal("video")}
            className="p-1.5 hover:bg-gray-100 hover:text-[#6C63FF] rounded-full transition-colors"
            title="Video Call"
          >
            <Video className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area (Padding: 12px, Gap: 8px) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* Date separator */}
        <div className="flex justify-center my-1">
          <span className="bg-gray-200/70 text-gray-500 text-[10px] font-medium px-2.5 py-0.5 rounded-full select-none">
            ថ្ងៃនេះ (Today)
          </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const showActions = activeMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isMe ? "items-end" : "items-start"
              } relative group`}
            >
              {/* Reply Reference Preview */}
              {msg.replyTo && (
                <div
                  className={`text-[10px] px-2.5 py-0.5 mb-1 rounded-lg max-w-[75%] truncate border-l-2 bg-gray-100 text-gray-600 ${
                    isMe
                      ? "border-[#6C63FF] mr-1"
                      : "border-gray-400 ml-1"
                  }`}
                >
                  <span className="font-semibold">{msg.replyTo.senderName}: </span>
                  <span>{msg.replyTo.text}</span>
                </div>
              )}

              {/* Message Bubble Container (Chat Bubble Padding: 8px 12px, Border Radius: 10px, Font: 13px) */}
              <div className="relative max-w-[82%]">
                <div
                  onClick={() =>
                    setActiveMessageId(activeMessageId === msg.id ? null : msg.id)
                  }
                  className={`px-3 py-2 transition-transform cursor-pointer rounded-xl ${
                    isMe
                      ? "bg-[#6C63FF] text-white rounded-tr-none shadow-xs"
                      : "bg-white text-[#2D3436] rounded-tl-none shadow-2xs border border-gray-100"
                  }`}
                >
                  {/* Image Attachment */}
                  {msg.imageUrl && (
                    <div className="mb-1.5 overflow-hidden rounded-lg">
                      <img
                        src={msg.imageUrl}
                        alt="attachment"
                        className="w-full max-h-52 object-cover rounded-md"
                      />
                    </div>
                  )}

                  {/* Text Message: 13px Compact */}
                  {msg.text && (
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  )}

                  {/* Timestamp: 10px & Status */}
                  <div
                    className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${
                      isMe ? "text-indigo-200" : "text-gray-400"
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {isMe && (
                      <span>
                        {msg.status === "read" ? (
                          <CheckCheck className="w-[14px] h-[14px] text-indigo-200" />
                        ) : (
                          <Check className="w-[14px] h-[14px]" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions Display */}
                {Object.keys(msg.reactions || {}).length > 0 && (
                  <div
                    className={`absolute -bottom-2.5 ${
                      isMe ? "right-2" : "left-2"
                    } bg-white shadow-xs border border-gray-200 rounded-full px-1.5 py-0.5 flex items-center space-x-0.5 text-[11px]`}
                  >
                    {Object.entries(msg.reactions).map(([emoji, uids]) => (
                      <span
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleReaction(msg.id, emoji);
                        }}
                        className="cursor-pointer hover:scale-120 transition-transform"
                      >
                        {emoji} {uids.length > 1 ? uids.length : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Context Action Bar */}
              {showActions && (
                <div
                  className={`flex items-center space-x-1 bg-white border border-gray-200 shadow-md rounded-xl p-1 my-1 z-20 animate-in fade-in zoom-in-95 ${
                    isMe ? "self-end" : "self-start"
                  }`}
                >
                  <div className="flex space-x-0.5 border-r border-gray-100 pr-1 mr-0.5">
                    {EMOJI_LIST.slice(0, 5).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="hover:scale-125 transition-transform p-0.5 text-sm"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setReplyingTo(msg);
                      setActiveMessageId(null);
                    }}
                    className="p-1 text-gray-500 hover:text-[#6C63FF] hover:bg-gray-50 rounded-lg text-[11px] flex items-center space-x-1"
                    title="Reply"
                  >
                    <CornerUpLeft className="w-3 h-3" />
                    <span>ឆ្លើយតប</span>
                  </button>

                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg text-[11px] flex items-center space-x-1"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Live Typing indicator */}
        {isTyping && (
          <div className="flex justify-start max-w-[80%]">
            <div className="bg-white px-3 py-2 rounded-xl rounded-tl-none shadow-2xs border border-gray-100 flex items-center gap-1.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#6C63FF] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[#6C63FF] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-[#6C63FF] rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="text-[11px] text-gray-400 italic">{otherUser.name} is typing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Smart AI Reply Suggestions Chips */}
      {smartReplies.length > 0 && (
        <div className="px-3 py-1.5 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto select-none scrollbar-none">
          <div className="flex items-center gap-1 text-[#6C63FF] text-[11px] font-bold flex-shrink-0">
            <Sparkles className="w-3 h-3 animate-spin" />
            <span>AI:</span>
          </div>
          {smartReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(reply)}
              className="px-2.5 py-1 rounded-full border border-[#6C63FF] text-[#6C63FF] text-[11px] font-medium hover:bg-[#6C63FF] hover:text-white transition-all whitespace-nowrap"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Reply Banner */}
      {replyingTo && (
        <div className="bg-white border-t border-gray-100 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[11px] text-gray-600 truncate">
            <CornerUpLeft className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>
              កំពុងឆ្លើយតបទៅ <strong>{replyingTo.senderName}</strong>:{" "}
              {replyingTo.text}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-400 hover:text-gray-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selected Image Preview */}
      {selectedImage && (
        <div className="bg-white border-t border-gray-100 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src={selectedImage}
              alt="preview"
              className="w-10 h-10 object-cover rounded-lg border border-gray-200"
            />
            <span className="text-[11px] text-gray-500 font-medium">រូបភាពបានជ្រើសរើស</span>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="text-red-500 hover:text-red-700 p-1 text-[11px] font-semibold"
          >
            លុប
          </button>
        </div>
      )}

      {/* Message Input Bottom Bar (Height: 38px, Input Placeholder: 12px, Button Padding: 8px 16px) */}
      <footer className="p-3 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2 bg-[#F5F7FA] rounded-xl px-3 h-[38px] border border-transparent focus-within:border-[#6C63FF]/30 focus-within:bg-white transition-all shadow-inner">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-[#6C63FF] transition-colors"
            title="Upload Photo"
          >
            <Paperclip className="w-[18px] h-[18px]" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
            placeholder="វាយសារនៅទីនេះ..."
            className="flex-1 bg-transparent border-none focus:outline-none text-[12px] text-[#2D3436] placeholder:text-gray-400"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() && !selectedImage}
            className={`px-3 py-1.5 rounded-lg transition-all text-[13px] flex items-center justify-center ${
              inputText.trim() || selectedImage
                ? "bg-[#6C63FF] text-white shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send className="w-[16px] h-[16px]" />
          </button>
        </div>
      </footer>

      {/* Call Modal */}
      {callModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl p-6 text-center max-w-xs w-full border border-slate-800 shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 rounded-full border-4 border-[#6C63FF] p-1 mb-4">
              <img
                src={
                  otherUser.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.name}`
                }
                alt={otherUser.name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <h3 className="text-base font-bold mb-1">{otherUser.name}</h3>
            <p className="text-xs text-slate-400 mb-6 animate-pulse">
              {callModal === "audio" ? "កំពុងហៅទូរស័ព្ទ..." : "កំពុងហៅជាវីដេអូ..."}
            </p>

            <button
              onClick={() => setCallModal(null)}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full text-xs transition-colors shadow-lg active:scale-95"
            >
              បញ្ចប់ការហៅ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
