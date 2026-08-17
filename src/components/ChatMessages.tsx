import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: any;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, loading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {messages.length === 0 && (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-4xl">🤖</p>
          <p className="text-lg font-medium mt-2">Hugi AI</p>
          <p className="text-sm">តើខ្ញុំអាចជួយអ្នកអ្វីខ្លះ?</p>
        </div>
      )}

      {messages.map((msg, index) => (
        <div
          key={msg.id || index}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}
        >
          <div
            className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl ${
              msg.role === "user"
                ? "bg-[#6C63FF] text-white rounded-br-none shadow-xs"
                : "bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100"
            }`}
          >
            {msg.role === "assistant" ? (
              <div className="markdown-body text-sm leading-relaxed">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            )}
            <p className="text-[10px] opacity-60 mt-1 text-right">
              {msg.timestamp?.toDate?.()?.toLocaleTimeString() || ""}
            </p>
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start mb-3">
          <div className="bg-white p-3.5 rounded-2xl rounded-bl-none shadow-sm border border-gray-100">
            <div className="flex gap-1.5 items-center">
              <span className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-xs text-gray-400 ml-1 font-medium">Hugi AI កំពុងគិត...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
