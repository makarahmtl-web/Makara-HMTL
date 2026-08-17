import React, { useState } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend }) => {
  const [text, setText] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText("");
      setShowQuickActions(false);
    }
  };

  const quickActions = [
    { icon: "📖", label: "Story", prompt: "ជួយសរសេររឿងប្រឌិតខ្លីមួយដ៏ជក់ចិត្ត និងមានអត្ថន័យអប់រំជាភាសាខ្មែរ" },
    { icon: "💕", label: "Love", prompt: "ជួយសរសេររឿងស្នេហារ៉ូមែនទិកផ្អែមល្ហែម និងកក់ក្តៅមួយរឿងខ្លីជាភាសាខ្មែរ" },
    { icon: "📝", label: "Poem", prompt: "ជួយតែងកំណាព្យខ្មែរខ្លីមួយយ៉ាងពិរោះរណ្តំ និងមានពាក្យចុងចួនល្អ" },
    { icon: "🎯", label: "Motivate", prompt: "សូមចែករំលែកពាក្យបំផុសគំនិត និងលើកទឹកចិត្តយ៉ាងមានកម្លាំងចិត្តសម្រាប់ថ្ងៃនេះ" },
    { icon: "🍳", label: "Recipe", prompt: "សូមណែនាំរូបមន្តធ្វើម្ហូបខ្មែរឆ្ងាញ់ៗមួយមុខ ជាមួយគ្រឿងផ្សំ និងរបៀបធ្វើលម្អិត" },
    { icon: "😂", label: "Joke", prompt: "សូមប្រាប់រឿងកំប្លែងសើចសប្បាយរីករាយមួយ ដែលសមរម្យ និងធ្វើឱ្យអារម្មណ៍ស្រស់ថ្លា" },
    { icon: "📅", label: "Plan", prompt: "ជួយរៀបចំកាលវិភាគការងារប្រចាំថ្ងៃ និងទម្លាប់រស់នៅឱ្យមានប្រសិទ្ធភាពខ្ពស់" },
  ];

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className={`p-2 rounded-lg transition-colors ${
            showQuickActions ? "bg-[#6C63FF]/10 text-[#6C63FF]" : "text-gray-500 hover:text-[#6C63FF]"
          }`}
          title=" Quick Actions (ប៊ូតុងរហ័ស)"
        >
          ⚡
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="សរសេរសំណួរនៅទីនេះ..."
          className="flex-1 resize-none border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] bg-gray-50/50"
          rows={1}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
        />

        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="bg-[#6C63FF] hover:bg-[#5a51e6] text-white p-2.5 rounded-xl disabled:opacity-50 transition-all shadow-sm active:scale-95"
        >
          ➤
        </button>
      </div>

      {showQuickActions && (
        <div className="flex gap-2 mt-2.5 flex-wrap pt-2 border-t border-gray-100 animate-in fade-in duration-200">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                onSend(action.prompt);
                setShowQuickActions(false);
              }}
              className="bg-gray-100 hover:bg-[#6C63FF]/10 hover:text-[#6C63FF] px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
