import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugiLogo } from "./HugiLogo";
import {
  Send,
  Sparkles,
  Bot,
  Copy,
  Check,
  Trash2,
  BookOpen,
  Heart,
  Edit3,
  Flame,
  Utensils,
  Smile,
  Calendar,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  X,
} from "lucide-react";
import { User } from "../types";
import { GeminiService } from "../services/gemini";
import { AiChatService, AIChatSession } from "../services/aiChat.service";
import ReactMarkdown from "react-markdown";

interface FloatingAIChatProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ACTION_BUTTONS = [
  {
    id: "story",
    label: "Story",
    khmer: "សរសេររឿង",
    emoji: "📖",
    prompt: "ជួយសរសេររឿងប្រឌិតខ្លីមួយដ៏ជក់ចិត្ត និងមានអត្ថន័យអប់រំជាភាសាខ្មែរ",
  },
  {
    id: "love",
    label: "Love",
    khmer: "រឿងស្នេហា",
    emoji: "💕",
    prompt: "ជួយសរសេររឿងស្នេហារ៉ូមែនទិកផ្អែមល្ហែម និងកក់ក្តៅមួយរឿងខ្លីជាភាសាខ្មែរ",
  },
  {
    id: "poem",
    label: "Poem",
    khmer: "សរសេរកំណាព្យ",
    emoji: "📝",
    prompt: "ជួយតែងកំណាព្យខ្មែរខ្លីមួយយ៉ាងពិរោះរណ្តំ និងមានពាក្យចុងចួនល្អ",
  },
  {
    id: "motivation",
    label: "Motivate",
    khmer: "បំផុសគំនិត",
    emoji: "🎯",
    prompt: "សូមចែករំលែកពាក្យបំផុសគំនិត និងលើកទឹកចិត្តយ៉ាងមានកម្លាំងចិត្តសម្រាប់ថ្ងៃនេះ",
  },
  {
    id: "recipe",
    label: "Recipe",
    khmer: "រូបមន្តធ្វើម្ហូប",
    emoji: "🍳",
    prompt: "សូមណែនាំរូបមន្តធ្វើម្ហូបខ្មែរឆ្ងាញ់ៗមួយមុខ ជាមួយគ្រឿងផ្សំ និងរបៀបធ្វើលម្អិត",
  },
];

export const FloatingAIChat: React.FC<FloatingAIChatProps> = ({ currentUser, isOpen, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatSessions, setChatSessions] = useState<AIChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string; timestamp?: any }>>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, currentUser]);

  const loadSessions = async () => {
    try {
      const history = await AiChatService.getChatHistory(currentUser.id);
      setChatSessions(history);
      if (history.length > 0) {
        if (!currentChatId || !history.some(h => h.id === currentChatId)) {
          setCurrentChatId(history[0].id);
          setMessages(history[0].messages || []);
        }
      } else {
        handleNewChat();
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
    }
  };

  const handleSelectChat = async (chatId: string) => {
    setCurrentChatId(chatId);
    const chat = await AiChatService.getChat(currentUser.id, chatId);
    if (chat) {
      setMessages(chat.messages || []);
    }
  };

  const handleNewChat = async () => {
    try {
      const newId = await AiChatService.createNewChat(currentUser.id);
      setCurrentChatId(newId);
      setMessages([]);
      await loadSessions();
    } catch (err) {
      console.error("Error creating new chat:", err);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await AiChatService.deleteChat(currentUser.id, chatId);
      const updated = chatSessions.filter(c => c.id !== chatId);
      setChatSessions(updated);
      if (currentChatId === chatId) {
        if (updated.length > 0) {
          setCurrentChatId(updated[0].id);
          setMessages(updated[0].messages || []);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុបប្រវត្តិសន្ទនាទាំងអស់មែនទេ?")) return;
    try {
      await AiChatService.clearAllChats(currentUser.id);
      setChatSessions([]);
      handleNewChat();
    } catch (err) {
      console.error("Error clearing all chats:", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isGenerating) return;

    let activeId = currentChatId;
    if (!activeId) {
      activeId = await AiChatService.createNewChat(currentUser.id);
      setCurrentChatId(activeId);
    }

    const userMessage = text.trim();
    setInputText("");

    const newMsgObj = {
      id: Date.now().toString(),
      role: "user" as const,
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, newMsgObj];
    setMessages(updatedMessages);

    try {
      await AiChatService.saveMessage(currentUser.id, activeId, "user", userMessage);
    } catch (err) {
      console.error("Error saving user message:", err);
    }

    setIsGenerating(true);

    try {
      const historyToSend = updatedMessages.slice(0, -1).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || new Date().toISOString(),
      }));

      const aiResponseText = await GeminiService.chatWithAI(userMessage, historyToSend);

      const aiMsgObj = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: aiResponseText || "សូមអភ័យទោស មានបញ្ហាបន្តិចបន្តួចកើតឡើង។",
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiMsgObj];
      setMessages(finalMessages);

      await AiChatService.saveMessage(currentUser.id, activeId, "assistant", aiMsgObj.content);
      loadSessions();
    } catch (err) {
      console.error("AI Generation error:", err);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: "សូមអភ័យទោស ការតភ្ជាប់ទៅកាន់ Hugi AI មានបញ្ហាអាក់ខានបន្តិច។ សូមព្យាយាមម្ដងទៀត។",
        timestamp: new Date().toISOString(),
      };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        drag
        dragMomentum={false}
        dragElastic={0.05}
        className={`fixed z-50 w-96 max-w-[92vw] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          isMinimized ? "h-14" : "h-[540px] max-h-[85vh]"
        }`}
        style={{
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
          bottom: "24px",
          right: "24px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 cursor-grab active:cursor-grabbing border-b border-gray-200/50 bg-white/40">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-[#6C63FF] p-1 rounded-md transition-colors"
              title="ប្រវត្តិសន្ទនា (Chat History)"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <div className="w-7 h-7 rounded-full bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-xs text-gray-900">Hugi AI</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md w-7 h-7 flex items-center justify-center font-bold"
              title={isMinimized ? "ពង្រីក (Expand)" : "បង្រួម (Minimize)"}
            >
              {isMinimized ? "□" : "−"}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 p-1 rounded-md w-7 h-7 flex items-center justify-center"
              title="បិទ (Close)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isMinimized && (
          <div className="flex-1 flex relative overflow-hidden">
            {/* Sidebar drawer inside chat */}
            {sidebarOpen && (
              <div className="w-48 bg-white/90 border-r border-gray-200/50 flex flex-col z-10 absolute h-full shadow-md">
                <div className="p-2 border-b border-gray-100">
                  <button
                    onClick={handleNewChat}
                    className="w-full bg-[#6C63FF] text-white py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Chat</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                  {chatSessions.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => {
                        handleSelectChat(chat.id);
                        setSidebarOpen(false);
                      }}
                      className={`group flex items-center justify-between p-2 rounded-lg text-[11px] cursor-pointer ${
                        currentChatId === chat.id ? "bg-[#6C63FF]/10 text-[#6C63FF] font-bold" : "hover:bg-gray-100"
                      }`}
                    >
                      <span className="truncate flex-1">{chat.title || "New Chat"}</span>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {chatSessions.length > 0 && (
                  <div className="p-2 border-t border-gray-100">
                    <button
                      onClick={handleClearAll}
                      className="w-full text-red-500 text-[10px] py-1 hover:bg-red-50 rounded font-semibold"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Main Chat Panel */}
            <div className="flex-1 flex flex-col h-full bg-transparent">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-6 px-2 text-gray-500">
                    <p className="text-2xl mb-1">🤖</p>
                    <p className="text-xs font-bold text-gray-800">សួស្តី! ខ្ញុំឈ្មោះ Hugi AI</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">តើខ្ញុំអាចជួយអ្នកអ្វីខ្លះថ្ងៃនេះ?</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed shadow-xs ${
                          msg.role === "user"
                            ? "bg-[#6C63FF] text-white rounded-br-none"
                            : "bg-white/90 text-gray-800 rounded-bl-none border border-gray-100"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="markdown-body space-y-1">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}

                        {msg.role === "assistant" && (
                          <div className="mt-1.5 pt-1 border-t border-gray-200/50 flex justify-end">
                            <button
                              onClick={() => copyToClipboard(msg.content, msg.id || index.toString())}
                              className="text-[9px] text-gray-400 hover:text-[#6C63FF] flex items-center space-x-1"
                            >
                              {copiedId === (msg.id || index.toString()) ? (
                                <span className="text-emerald-600 font-bold">បានចម្លង!</span>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>ចម្លង</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-white/90 p-2.5 rounded-2xl rounded-bl-none shadow-xs border border-gray-100 flex items-center space-x-1.5">
                      <Loader2 className="w-3.5 h-3.5 text-[#6C63FF] animate-spin" />
                      <span className="text-[11px] text-gray-500 font-medium">Hugi AI កំពុងគិត...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              <div className="flex gap-1.5 p-2 flex-wrap border-t border-gray-200/40 bg-white/30">
                {QUICK_ACTION_BUTTONS.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => handleSendMessage(act.prompt)}
                    className="bg-white/80 hover:bg-[#6C63FF]/10 hover:text-[#6C63FF] border border-gray-200/60 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all shadow-2xs flex items-center space-x-1"
                  >
                    <span>{act.emoji}</span>
                    <span>{act.label}</span>
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 p-2.5 border-t border-gray-200/50 bg-white/60">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  placeholder="សរសេរសំណួរនៅទីនេះ..."
                  disabled={isGenerating}
                  className="flex-1 bg-white/80 border border-gray-200 rounded-full px-3.5 py-2 text-[11px] focus:outline-none focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF]"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isGenerating}
                  className="bg-[#6C63FF] text-white p-2 rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-50 transition-all shadow-sm active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
