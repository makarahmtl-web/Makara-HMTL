import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  X,
  Send,
  Image as ImageIcon,
  Heart,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Story, User } from "../types";
import { GeminiService } from "../services/gemini";

interface StoryViewProps {
  currentUser: User;
  stories: Story[];
  onAddStory: (story: Story) => void;
  onSendStoryReply: (targetUserId: string, message: string) => void;
}

const BG_GRADIENTS = [
  "from-[#6C63FF] to-[#3B82F6]",
  "from-[#EC4899] to-[#8B5CF6]",
  "from-[#10B981] to-[#06B6D4]",
  "from-[#F59E0B] to-[#EF4444]",
  "from-[#1E293B] to-[#0F172A]",
  "from-[#8B5CF6] to-[#D946EF]",
];

const EMOJI_REACTIONS = ["❤️", "🔥", "😂", "👏", "🎉", "😮"];

export const StoryView: React.FC<StoryViewProps> = ({
  currentUser,
  stories,
  onAddStory,
  onSendStoryReply,
}) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"text" | "image">("text");

  // Creation State
  const [storyText, setStoryText] = useState("");
  const [storyBg, setStoryBg] = useState(BG_GRADIENTS[0]);
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  // Viewer Reply State
  const [replyText, setReplyText] = useState("");
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<any>(null);

  // Story Progress Timer
  useEffect(() => {
    if (activeStoryIndex === null) return;

    setStoryProgress(0);
    const step = 2; // 5 seconds total duration
    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, 100);

    progressTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [activeStoryIndex]);

  const handleOpenViewer = (index: number) => {
    setActiveStoryIndex(index);
  };

  const handleCloseViewer = () => {
    setActiveStoryIndex(null);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  };

  const handleNextStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      handleCloseViewer();
    }
  };

  const handlePrevStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setStoryImage(event.target?.result as string);
        setCreateType("image");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAICaption = async () => {
    setIsGeneratingCaption(true);
    try {
      const prompt =
        storyImage
          ? "សរសេរ caption ដ៏ទាក់ទាញ ខ្លី និងមានភាពរីករាយសម្រាប់ Story នេះជាភាសាខ្មែរ រួមជាមួយ emojis"
          : "សរសេរសម្រង់សម្តី ឬ caption លើកទឹកចិត្តប្រចាំថ្ងៃខ្លីមួយជាភាសាខ្មែរ សម្រាប់ Story";
      const caption = await GeminiService.chatWithAI(prompt);
      setStoryText(caption.replace(/^"|"$/g, ""));
    } catch {
      setStoryText("សូមឱ្យថ្ងៃនេះជាថ្ងៃដ៏ស្រស់បំព្រង! ✨🌸");
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleCreateStory = () => {
    if (createType === "text" && !storyText.trim()) return;
    if (createType === "image" && !storyImage) return;

    const newStory: Story = {
      id: "story_" + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      type: createType,
      imageUrl: createType === "image" ? storyImage || undefined : undefined,
      text: storyText.trim() || undefined,
      bgColor: createType === "text" ? storyBg : undefined,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      likes: [],
      viewedBy: [currentUser.id],
    };

    onAddStory(newStory);

    // Reset Form
    setStoryText("");
    setStoryImage(null);
    setShowCreateModal(false);
  };

  const handleReactToStory = (emoji: string) => {
    if (activeStoryIndex === null) return;
    const currentStory = stories[activeStoryIndex];

    if (emoji === "❤️") {
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
    onSendStoryReply(currentStory.userId, emoji);
  };

  const handleSendStoryReply = () => {
    if (!replyText.trim() || activeStoryIndex === null) return;
    const currentStory = stories[activeStoryIndex];

    onSendStoryReply(currentStory.userId, replyText);
    setReplyText("");
  };

  const currentActiveStory =
    activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <div className="flex flex-col min-h-full pb-20 max-w-md mx-auto px-3 pt-3 font-sans text-[#2D3436]">
      {/* Top Header matching Compact Mode (App Name: 18px font, Spacing: 10px) */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h1 className="text-[18px] font-black text-gray-900 tracking-tight leading-tight">
            រឿងរ៉ាវ (Stories)
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            ចែករំលែកពេលវេលាប្រចាំថ្ងៃរបស់អ្នក
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-8 h-8 rounded-xl bg-[#6C63FF] hover:bg-[#5a51e6] text-white flex items-center justify-center shadow-xs active:scale-95 transition-all"
          title="បង្កើត Story ថ្មី"
          aria-label="New Story"
        >
          <Plus className="w-[18px] h-[18px] stroke-[2.5]" />
        </button>
      </div>

      {/* Stories Grid (Card Padding: 10px, Gap: 10px, Radius: 10px) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Create My Story Card */}
        <div
          onClick={() => setShowCreateModal(true)}
          className="aspect-[3/4] rounded-xl bg-white border-2 border-dashed border-[#6C63FF]/30 p-3 flex flex-col items-center justify-center cursor-pointer hover:border-[#6C63FF] hover:bg-[#6C63FF]/5 transition-all group active:scale-98 shadow-2xs"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-[#6C63FF] text-[#6C63FF] group-hover:text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-all">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-[12px] font-bold text-gray-800 group-hover:text-[#6C63FF] text-center transition-colors">
            បង្កើត Story ថ្មី
          </span>
          <span className="text-[9px] text-gray-400 text-center mt-0.5">
            រូបភាព ឬ អក្សរ
          </span>
        </div>

        {/* Existing Stories List */}
        {stories.map((story, index) => {
          const initial = story.userName.charAt(0).toUpperCase();

          return (
            <div
              key={story.id}
              onClick={() => handleOpenViewer(index)}
              className="relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer shadow-2xs hover:shadow-xs transition-all group active:scale-98 border border-gray-100"
            >
              {/* Background Media */}
              {story.type === "image" && story.imageUrl ? (
                <img
                  src={story.imageUrl}
                  alt={story.userName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${
                    story.bgColor || "from-purple-600 to-indigo-600"
                  } p-3 flex items-center justify-center text-center text-white text-[11px] font-semibold leading-relaxed shadow-inner`}
                >
                  <span className="line-clamp-4">{story.text}</span>
                </div>
              )}

              {/* Gradient Bottom Shadow */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

              {/* Author Badge Bottom Info (Story Username: 11px Compact, Avatar: 26px) */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center space-x-1.5 pointer-events-none">
                <div className="w-[26px] h-[26px] rounded-full border border-[#6C63FF] overflow-hidden bg-white text-[#6C63FF] font-bold flex items-center justify-center text-[9px] flex-shrink-0 shadow-2xs">
                  {story.userAvatar && !story.userAvatar.includes("unsplash") ? (
                    <img
                      src={story.userAvatar}
                      alt={story.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-[11px] font-bold truncate leading-tight drop-shadow-xs">
                    {story.userName}
                  </div>
                  <div className="text-white/80 text-[9px] font-normal">
                    13 នាទី
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Story Viewer Modal */}
      {currentActiveStory && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between max-w-md mx-auto h-screen animate-in fade-in duration-200">
          {/* Top Progress Bars */}
          <div className="p-3 z-20 flex flex-col space-y-2">
            <div className="flex space-x-1.5 w-full">
              {stories.map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className={`h-full bg-white transition-all duration-100 ${
                      i < activeStoryIndex!
                        ? "w-full"
                        : i === activeStoryIndex
                        ? `${storyProgress}%`
                        : "w-0"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Author Header */}
            <div className="flex items-center justify-between text-white mt-1">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full ring-2 ring-white overflow-hidden bg-[#6C63FF] text-white font-bold flex items-center justify-center text-xs">
                  {currentActiveStory.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-[13px] leading-tight">
                    {currentActiveStory.userName}
                  </h4>
                  <p className="text-[10px] text-white/70">
                    24h story
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCloseViewer}
                  className="p-1.5 hover:bg-white/20 rounded-full text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Left/Right Navigation Clickable Zones */}
          <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={handlePrevStory} />
          <div className="absolute inset-y-0 right-0 w-1/4 z-10" onClick={handleNextStory} />

          {/* Story Body Display */}
          <div className="flex-1 relative flex items-center justify-center p-4">
            {currentActiveStory.type === "image" && currentActiveStory.imageUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={currentActiveStory.imageUrl}
                  alt="Story"
                  className="max-h-full max-w-full object-contain rounded-2xl"
                />
                {currentActiveStory.text && (
                  <div className="absolute bottom-6 left-4 right-4 bg-black/60 backdrop-blur-xs text-white p-3 rounded-2xl text-center text-xs font-medium">
                    {currentActiveStory.text}
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`w-full h-[75%] rounded-3xl bg-gradient-to-br ${
                  currentActiveStory.bgColor || "from-purple-600 to-indigo-600"
                } flex items-center justify-center p-6 text-center shadow-2xl`}
              >
                <p className="text-white text-lg font-bold leading-relaxed whitespace-pre-wrap">
                  {currentActiveStory.text}
                </p>
              </div>
            )}

            {/* Heart Burst Reaction Animation */}
            {showHeartAnimation && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping duration-500">
                <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-lg" />
              </div>
            )}
          </div>

          {/* Bottom Viewer Actions & Reply */}
          <div className="p-3 z-20 bg-gradient-to-t from-black/90 to-transparent flex flex-col space-y-2">
            {/* Quick Emoji Reaction Bar */}
            <div className="flex justify-around py-1">
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReactToStory(emoji)}
                  className="text-2xl hover:scale-125 active:scale-95 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Reply Input */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendStoryReply();
                }}
                placeholder={`ផ្ញើសារឆ្លើយតបទៅ ${currentActiveStory.userName}...`}
                className="flex-1 bg-white/20 backdrop-blur-md text-white placeholder-white/60 border border-white/30 rounded-full px-4 h-[38px] text-[12px] focus:outline-none focus:border-white"
              />
              <button
                onClick={handleSendStoryReply}
                disabled={!replyText.trim()}
                className="w-[38px] h-[38px] rounded-full bg-[#6C63FF] text-white flex items-center justify-center disabled:opacity-50 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 border border-gray-100 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-[14px] text-gray-900 mb-3">
              បង្កើត Story ថ្មី
            </h3>

            {/* Type Selector Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-xl mb-3">
              <button
                onClick={() => setCreateType("text")}
                className={`py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                  createType === "text"
                    ? "bg-white text-[#6C63FF] shadow-2xs"
                    : "text-gray-500"
                }`}
              >
                អត្ថបទ (Text)
              </button>
              <button
                onClick={() => {
                  setCreateType("image");
                  if (!storyImage) fileInputRef.current?.click();
                }}
                className={`py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                  createType === "image"
                    ? "bg-white text-[#6C63FF] shadow-2xs"
                    : "text-gray-500"
                }`}
              >
                រូបភាព (Photo)
              </button>
            </div>

            {/* Text Mode Preview & Edit */}
            {createType === "text" ? (
              <div className="space-y-3">
                <div
                  className={`w-full aspect-[4/3] rounded-xl bg-gradient-to-br ${storyBg} p-3 flex items-center justify-center text-center shadow-inner`}
                >
                  <textarea
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    placeholder="វាយអត្ថបទ Story របស់អ្នកនៅទីនេះ..."
                    rows={3}
                    className="w-full bg-transparent text-white text-center text-[13px] font-bold placeholder-white/70 border-none resize-none focus:outline-none"
                  />
                </div>

                {/* Gradient Picker */}
                <div>
                  <div className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    ជ្រើសរើសពណ៌ផ្ទៃខាងក្រោយ
                  </div>
                  <div className="flex space-x-2">
                    {BG_GRADIENTS.map((bg) => (
                      <button
                        key={bg}
                        onClick={() => setStoryBg(bg)}
                        className={`w-6 h-6 rounded-full bg-gradient-to-br ${bg} ${
                          storyBg === bg
                            ? "ring-2 ring-offset-1 ring-[#6C63FF]"
                            : ""
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Image Mode Preview & Edit */
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[4/3] rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
                >
                  {storyImage ? (
                    <img
                      src={storyImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-[11px] font-medium">ចុចដើម្បីជ្រើសរើសរូបភាព</span>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <input
                  type="text"
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="បន្ថែម Caption រូបភាព..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 h-[38px] text-[12px] text-gray-800 focus:outline-none focus:border-[#6C63FF]"
                />
              </div>
            )}

            {/* AI Caption Assist Button */}
            <button
              onClick={handleGenerateAICaption}
              disabled={isGeneratingCaption}
              className="w-full mt-2.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-[#6C63FF] rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-colors border border-indigo-100"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isGeneratingCaption
                  ? "កំពុងតែង Caption ដោយ AI..."
                  : "បង្កើត Caption ស្វ័យប្រវត្តិតាមរយៈ AI"}
              </span>
            </button>

            {/* Submit Button */}
            <button
              onClick={handleCreateStory}
              disabled={
                createType === "text" ? !storyText.trim() : !storyImage
              }
              className="w-full mt-3 bg-[#6C63FF] hover:bg-[#5a51e6] text-white font-bold py-2 rounded-xl text-[13px] transition-all shadow-xs disabled:opacity-50"
            >
              បង្ហោះ Story ឥឡូវនេះ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
