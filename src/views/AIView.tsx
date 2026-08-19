import React, { useState, useEffect, useRef } from "react";
import { HugiLogo } from "../components/HugiLogo";
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
  GripHorizontal,
  X,
} from "lucide-react";
import { User } from "../types";
import { GeminiService } from "../services/gemini";
import { AiChatService, AIChatSession } from "../services/aiChat.service";
import ReactMarkdown from "react-markdown";

interface AIViewProps {
  currentUser: User;
}

const QUICK_ACTION_BUTTONS = [
  {
    id: "story",
    label: "Write Story",
    khmer: "សរសេររឿង",
    icon: BookOpen,
    emoji: "📖",
    color: "bg-amber-50/80 text-amber-700 border-amber-200 hover:bg-amber-100",
    prompt: "ជួយសរសេររឿងប្រឌិតខ្លីមួយដ៏ជក់ចិត្ត និងមានអត្ថន័យអប់រំជាភាសាខ្មែរ",
  },
  {
    id: "love",
    label: "Love Story",
    khmer: "រឿងស្នេហា",
    icon: Heart,
    emoji: "💕",
    color: "bg-pink-50/80 text-pink-700 border-pink-200 hover:bg-pink-100",
    prompt: "ជួយសរសេររឿងស្នេហារ៉ូមែនទិកផ្អែមល្ហែម និងកក់ក្តៅមួយរឿងខ្លីជាភាសាខ្មែរ",
  },
  {
    id: "poem",
    label: "Write Poem",
    khmer: "សរសេរកំណាព្យ",
    icon: Edit3,
    emoji: "📝",
    color: "bg-purple-50/80 text-purple-700 border-purple-200 hover:bg-purple-100",
    prompt: "ជួយតែងកំណាព្យខ្មែរខ្លីមួយយ៉ាងពិរោះរណ្តំ និងមានពាក្យចុងចួនល្អ",
  },
  {
    id: "motivation",
    label: "Motivation",
    khmer: "បំផុសគំនិត",
    icon: Flame,
    emoji: "🎯",
    color: "bg-orange-50/80 text-orange-700 border-orange-200 hover:bg-orange-100",
    prompt: "សូមចែករំលែកពាក្យបំផុសគំនិត និងលើកទឹកចិត្តយ៉ាងមានកម្លាំងចិត្តសម្រាប់ថ្ងៃនេះ",
  },
  {
    id: "recipe",
    label: "Recipe",
    khmer: "រូបមន្តធ្វើម្ហូប",
    icon: Utensils,
    emoji: "🍳",
    color: "bg-emerald-50/80 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    prompt: "សូមណែនាំរូបមន្តធ្វើម្ហូបខ្មែរឆ្ងាញ់ៗមួយមុខ ជាមួយគ្រឿងផ្សំ និងរបៀបធ្វើលម្អិត",
  },
  {
    id: "joke",
    label: "Joke",
    khmer: "រឿងកំប្លែង",
    icon: Smile,
    emoji: "😂",
    color: "bg-yellow-50/80 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
    prompt: "សូមប្រាប់រឿងកំប្លែងសើចសប្បាយរីករាយមួយ ដែលសមរម្យ និងធ្វើឱ្យអារម្មណ៍ស្រស់ថ្លា",
  },
  {
    id: "plan",
    label: "Plan",
    khmer: "រៀបចំកាលវិភាគ",
    icon: Calendar,
    emoji: "📅",
    color: "bg-indigo-50/80 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    prompt: "ជួយរៀបចំកាលវិភាគការងារប្រចាំថ្ងៃ និងទម្លាប់រស់នៅឱ្យមានប្រសិទ្ធភាពខ្ពស់",
  },
];

export const AIView: React.FC<AIViewProps> = ({ currentUser }) => {
  const [chatSessions, setChatSessions] = useState<AIChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string; timestamp?: any }>>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, [currentUser]);

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

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-blue-50/50 font-sans text-[#2D3436] overflow-hidden relative items-center justify-center p-2 sm:p-6">
      
      {/* Floating Glassmorphism Chat Box */}
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
        className="ai-chat-box w-full max-w-5xl h-[calc(100vh-100px)] sm:h-[85vh] flex overflow-hidden transition-shadow duration-200 select-none z-30"
      >
        {/* 1. Sidebar (បញ្ជីឆាតចំហៀង) */}
        <aside
          className={`${
            sidebarOpen ? "w-72" : "w-0"
          } transition-all duration-300 bg-white/60 backdrop-blur-md border-r border-white/40 flex flex-col z-20 overflow-hidden absolute md:relative h-full`}
        >
          {/* Sidebar Header */}
          <div className="p-3 border-b border-gray-200/40 flex items-center justify-between bg-white/40">
            <div className="flex items-center space-x-2">
              <HugiLogo className="w-6 h-6" />
              <span className="font-black text-[13px] text-gray-900 tracking-tight">Hugi AI Chat History</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-500 hover:text-gray-700 p-1 rounded-lg"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-2.5 border-b border-gray-200/40">
            <button
              onClick={handleNewChat}
              className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] text-white py-2 px-3 rounded-xl font-bold text-[12px] flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>បង្កើតឆាតថ្មី (New Chat)</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chatSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-[11px]">
                មិនទាន់មានប្រវត្តិសន្ទនា
              </div>
            ) : (
              chatSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    handleSelectChat(session.id);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-[12px] font-medium cursor-pointer transition-all ${
                    currentChatId === session.id
                      ? "bg-[#6C63FF]/15 text-[#6C63FF] font-bold border border-[#6C63FF]/30"
                      : "text-gray-700 hover:bg-white/80"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{session.title || "New Chat"}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 rounded-md transition-opacity"
                    title="លុប Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Clear All Footer */}
          {chatSessions.length > 0 && (
            <div className="p-2.5 border-t border-gray-200/40 bg-white/40">
              <button
                onClick={handleClearAll}
                className="w-full text-red-600 hover:bg-red-50/80 py-1.5 px-3 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>លុបទាំងអស់ (Clear All)</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
          {/* Top Navbar / Draggable Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="h-12 border-b border-white/40 flex items-center justify-between px-3 bg-white/50 backdrop-blur-md z-10 cursor-move"
          >
            <div className="flex items-center space-x-2">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="text-gray-600 hover:text-[#6C63FF] p-1.5 rounded-lg hover:bg-white/80 transition-all"
                  title="បើក Sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center space-x-1.5">
                <div className="w-7 h-7 rounded-full bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-black text-[13px] text-gray-900 tracking-tight">Hugi AI Assistant</span>
              </div>
              <div className="hidden sm:flex items-center space-x-1 text-gray-400 ml-2">
                <GripHorizontal className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-wider font-semibold">Drag Window</span>
              </div>
            </div>
          </div>

          {/* Chat Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto my-auto py-12">
                <div className="w-14 h-14 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center mb-3 shadow-sm">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-[16px] font-black text-gray-900 mb-1">
                  សួស្ដី! ខ្ញុំជា Hugi AI 🤖✨
                </h3>
                <p className="text-[12px] text-gray-600 mb-6">
                  តើខ្ញុំអាចជួយអ្វីដល់អ្នកថ្ងៃនេះ? សួរអ្វីក៏បាន ឬជ្រើសរើសប៊ូតុងរហ័សខាងក្រោម៖
                </p>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full text-left">
                  {QUICK_ACTION_BUTTONS.map((act) => {
                    return (
                      <button
                        key={act.id}
                        onClick={() => handleSendMessage(act.prompt)}
                        className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center space-x-2 transition-all active:scale-95 shadow-2xs ${act.color}`}
                      >
                        <span className="text-[14px]">{act.emoji}</span>
                        <span className="truncate">{act.khmer}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`flex items-start space-x-2.5 ${
                    msg.role === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"
                  } animate-in fade-in duration-200`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold shadow-xs ${
                      msg.role === "user" ? "bg-gray-800" : "bg-[#6C63FF]"
                    }`}
                  >
                    {msg.role === "user" ? currentUser.name?.[0]?.toUpperCase() || "U" : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#6C63FF] text-white rounded-tr-none"
                        : "bg-white/90 text-gray-800 rounded-tl-none border border-white/60 backdrop-blur-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="markdown-body space-y-2">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {/* Copy Button for Assistant */}
                    {msg.role === "assistant" && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-center justify-end">
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id || index.toString())}
                          className="text-[10px] text-gray-500 hover:text-[#6C63FF] flex items-center space-x-1 font-semibold transition-colors"
                        >
                          {copiedId === (msg.id || index.toString()) ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">បានចម្លង!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>ចម្លង (Copy)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading Animation */}
            {isGenerating && (
              <div className="flex items-start space-x-2.5 animate-in fade-in">
                <div className="w-7 h-7 rounded-full bg-[#6C63FF] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white/90 border border-white/60 rounded-2xl rounded-tl-none px-4 py-3 flex items-center space-x-2 backdrop-blur-sm shadow-sm">
                  <Loader2 className="w-4 h-4 text-[#6C63FF] animate-spin" />
                  <span className="text-[12px] font-semibold text-gray-600">Hugi AI កំពុងគិត និងសរសេរ...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-white/40 bg-white/50 backdrop-blur-md">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2 max-w-3xl mx-auto"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="សួរអ្វីក៏បានជាមួយ Hugi AI..."
                  disabled={isGenerating}
                  className="w-full bg-white/80 border border-white/60 rounded-2xl pl-4 pr-10 py-2.5 text-[12px] font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] transition-all shadow-inner"
                />
                <Sparkles className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isGenerating}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all shadow-md flex-shrink-0 ${
                  !inputText.trim() || isGenerating
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-[#6C63FF] hover:bg-[#5a51e6] active:scale-95 shadow-[#6C63FF]/30"
                }`}
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
