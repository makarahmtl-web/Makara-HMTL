import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  X,
  Send,
  Image as ImageIcon,
  Heart,
  Sparkles,
  Trash2,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Smile,
  Check,
  Globe,
  Loader2,
} from "lucide-react";
import { Story, Post, PostComment, User } from "../types";
import { GeminiService } from "../services/gemini";
import { FirebaseService } from "../services/firebase";
import { formatKhmerRelativeTime } from "../utils/time";

interface StoryViewProps {
  currentUser: User;
  stories?: Story[];
  onAddStory?: (story: Story) => void;
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

const EMOJI_REACTIONS = ["❤️", "🔥", "😂", "👏", "🎉", "😮", "🙏", "🥰"];

export const StoryView: React.FC<StoryViewProps> = ({
  currentUser,
  stories: initialStories = [],
  onAddStory,
  onSendStoryReply,
}) => {
  // Real-time Data States
  const [realtimeStories, setRealtimeStories] = useState<Story[]>(initialStories);
  const [realtimePosts, setRealtimePosts] = useState<Post[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Active Story Viewer State
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);

  // Create Story Modal State
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [storyCreateType, setStoryCreateType] = useState<"text" | "image">("text");
  const [storyText, setStoryText] = useState("");
  const [storyBg, setStoryBg] = useState(BG_GRADIENTS[0]);
  const [storyImageFile, setStoryImageFile] = useState<File | null>(null);
  const [storyImagePreview, setStoryImagePreview] = useState<string | null>(null);
  const [isPublishingStory, setIsPublishingStory] = useState(false);
  const [isGeneratingStoryCaption, setIsGeneratingStoryCaption] = useState(false);

  // Create Post Modal State
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [postText, setPostText] = useState("");
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [isGeneratingPostCaption, setIsGeneratingPostCaption] = useState(false);

  // Post Comments Drawer / Inline State
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInputMap, setCommentInputMap] = useState<{ [postId: string]: string }>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Image Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const storyFileInputRef = useRef<HTMLInputElement>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // 1. Subscribe to Real-time Stories (24h filter in FirebaseService)
  useEffect(() => {
    const unsubStories = FirebaseService.listenToStories((storiesList) => {
      setRealtimeStories(storiesList);
    });
    return () => unsubStories();
  }, []);

  // 2. Subscribe to Real-time Posts
  useEffect(() => {
    setIsLoadingFeed(true);
    const unsubPosts = FirebaseService.listenToPosts((postsList) => {
      setRealtimePosts(postsList);
      setIsLoadingFeed(false);
    });
    return () => unsubPosts();
  }, []);

  // 3. Story Viewer Progress Timer
  useEffect(() => {
    if (activeStoryIndex === null || realtimeStories.length === 0) return;

    setStoryProgress(0);
    const step = 2; // 5 seconds per story
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
  }, [activeStoryIndex, realtimeStories.length]);

  const handleOpenStoryViewer = (index: number) => {
    setActiveStoryIndex(index);
  };

  const handleCloseStoryViewer = () => {
    setActiveStoryIndex(null);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  };

  const handleNextStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < realtimeStories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      handleCloseStoryViewer();
    }
  };

  const handlePrevStory = () => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    }
  };

  // Story Image Picker
  const handleStoryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStoryImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setStoryImagePreview(event.target?.result as string);
        setStoryCreateType("image");
      };
      reader.readAsDataURL(file);
    }
  };

  // AI Caption for Story
  const handleGenerateStoryCaption = async () => {
    setIsGeneratingStoryCaption(true);
    try {
      const prompt =
        storyCreateType === "image"
          ? "សរសេរ caption ដ៏ទាក់ទាញ ខ្លី និងមានភាពរីករាយសម្រាប់ Story នេះជាភាសាខ្មែរ រួមជាមួយ emojis"
          : "សរសេរសម្រង់សម្តីលើកទឹកចិត្ត ឬពាក្យជូនពរប្រចាំថ្ងៃខ្លីមួយជាភាសាខ្មែរ សម្រាប់ Story";
      const caption = await GeminiService.chatWithAI(prompt);
      setStoryText(caption.replace(/^"|"$/g, "").trim());
    } catch {
      setStoryText("សូមឱ្យថ្ងៃនេះជាថ្ងៃដ៏ស្រស់បំព្រង និងពោរពេញដោយក្តីសុខ! ✨🌸");
    } finally {
      setIsGeneratingStoryCaption(false);
    }
  };

  // Publish Story to Firestore & Storage
  const handlePublishStory = async () => {
    if (storyCreateType === "text" && !storyText.trim()) return;
    if (storyCreateType === "image" && !storyImagePreview) return;

    setIsPublishingStory(true);
    try {
      let finalImageUrl = "";
      if (storyCreateType === "image" && storyImagePreview) {
        finalImageUrl = await FirebaseService.uploadMedia(
          `stories/${currentUser.id}/${Date.now()}.jpg`,
          storyImageFile || storyImagePreview
        );
      }

      const created = await FirebaseService.createStory({
        currentUser,
        type: storyCreateType,
        text: storyText.trim(),
        imageUrl: finalImageUrl,
        bgColor: storyCreateType === "text" ? storyBg : undefined,
      });

      if (onAddStory) onAddStory(created);

      // Reset form
      setStoryText("");
      setStoryImageFile(null);
      setStoryImagePreview(null);
      setShowCreateStoryModal(false);
      showToast("បានបង្ហោះ Story ដោយជោគជ័យ! 🎉");
    } catch (err) {
      console.error("Publish story error:", err);
      showToast("មានបញ្ហាក្នុងការបង្ហោះ Story សូមព្យាយាមម្តងទៀត");
    } finally {
      setIsPublishingStory(false);
    }
  };

  // Delete Story
  const handleDeleteStory = async (storyId: string) => {
    if (confirm("តើអ្នកពិតជាចង់លុប Story នេះមែនទេ?")) {
      await FirebaseService.deleteStory(storyId);
      handleCloseStoryViewer();
      showToast("បានលុប Story រួចរាល់");
    }
  };

  // React to Story
  const handleReactToStory = (emoji: string) => {
    if (activeStoryIndex === null) return;
    const currentStory = realtimeStories[activeStoryIndex];

    if (emoji === "❤️") {
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
      FirebaseService.likeStory(currentStory.id, currentUser.id);
    }
    onSendStoryReply(currentStory.userId, emoji);
    showToast(`បានផ្ញើ ${emoji} ទៅកាន់ ${currentStory.userName}`);
  };

  const handleSendStoryReply = () => {
    if (!replyText.trim() || activeStoryIndex === null) return;
    const currentStory = realtimeStories[activeStoryIndex];

    onSendStoryReply(currentStory.userId, replyText);
    setReplyText("");
    showToast(`បានផ្ញើសារឆ្លើយតបទៅកាន់ ${currentStory.userName}`);
  };

  // Post Image Picker
  const handlePostImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPostImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // AI Caption for Post
  const handleGeneratePostCaption = async () => {
    setIsGeneratingPostCaption(true);
    try {
      const prompt = postImagePreview
        ? "សរសេរសំណេរ status ឬ caption បង្ហោះលើ Facebook ដ៏ទាក់ទាញ ស៊ីអារម្មណ៍ និងមាន emojis ជាភាសាខ្មែរ"
        : "សរសេរ status បង្ហាញពីគំនិតវិជ្ជមាន ឬការចែករំលែកអារម្មណ៍ដ៏កក់ក្តៅប្រចាំថ្ងៃជាភាសាខ្មែរ";
      const caption = await GeminiService.chatWithAI(prompt);
      setPostText(caption.replace(/^"|"$/g, "").trim());
    } catch {
      setPostText("ថ្ងៃថ្មី ឱកាសថ្មី! សូមជូនពរអ្នកទាំងអស់គ្នាជួបតែសំណាងល្អ និងសេចក្តីសុខ 💖✨");
    } finally {
      setIsGeneratingPostCaption(false);
    }
  };

  // Publish Post to Firestore & Storage
  const handlePublishPost = async () => {
    if (!postText.trim() && !postImagePreview) return;

    setIsPublishingPost(true);
    try {
      let finalImageUrl = "";
      if (postImagePreview) {
        finalImageUrl = await FirebaseService.uploadMedia(
          `posts/${currentUser.id}/${Date.now()}.jpg`,
          postImageFile || postImagePreview
        );
      }

      await FirebaseService.createPost({
        currentUser,
        text: postText.trim(),
        imageUrl: finalImageUrl,
      });

      // Reset form
      setPostText("");
      setPostImageFile(null);
      setPostImagePreview(null);
      setShowCreatePostModal(false);
      showToast("បានបង្ហោះ Status របស់អ្នកដោយជោគជ័យ! 🚀");
    } catch (err) {
      console.error("Publish post error:", err);
      showToast("មានបញ្ហាក្នុងការបង្ហោះ Status");
    } finally {
      setIsPublishingPost(false);
    }
  };

  // Like Post
  const handleToggleLikePost = async (postId: string) => {
    await FirebaseService.likePost(postId, currentUser.id);
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (confirm("តើអ្នកពិតជាចង់លុបការបង្ហោះនេះមែនទេ?")) {
      await FirebaseService.deletePost(postId);
      showToast("បានលុបការបង្ហោះរួចរាល់");
    }
  };

  // Submit Comment
  const handleAddComment = async (postId: string) => {
    const commentText = commentInputMap[postId]?.trim();
    if (!commentText) return;

    setIsSubmittingComment(true);
    try {
      await FirebaseService.addCommentToPost(postId, {
        currentUser,
        text: commentText,
      });
      setCommentInputMap((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Comment submit error:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Share Post
  const handleSharePost = (post: Post) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `https://hugi.chat/posts/${post.id}\n${post.text}`
      );
      showToast("បានចម្លងតំណភ្ជាប់ការបង្ហោះរួចរាល់! 📋");
    } else {
      showToast("បានចែករំលែកការបង្ហោះ");
    }
  };

  const currentActiveStory =
    activeStoryIndex !== null && realtimeStories[activeStoryIndex]
      ? realtimeStories[activeStoryIndex]
      : null;

  return (
    <div className="flex flex-col min-h-full pb-24 max-w-md mx-auto px-3 pt-3 font-sans text-[#2D3436]">
      {/* Toast Notification Pop-up */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-full shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-green-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-[18px] font-black text-gray-900 tracking-tight leading-tight flex items-center space-x-1.5">
            <span>ទំព័រព័ត៌មាន និង Stories</span>
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ផ្សាយផ្ទាល់ Realtime • រឿងរ៉ាវប្រចាំថ្ងៃ</span>
          </p>
        </div>

        <button
          onClick={() => setShowCreateStoryModal(true)}
          className="w-8 h-8 rounded-xl bg-[#6C63FF] hover:bg-[#5a51e6] text-white flex items-center justify-center shadow-xs active:scale-95 transition-all"
          title="បង្កើត Story ថ្មី"
          aria-label="New Story"
        >
          <Plus className="w-[18px] h-[18px] stroke-[2.5]" />
        </button>
      </div>

      {/* ========================================================
          1. HORIZONTAL STORIES CAROUSEL (Facebook Style)
          ======================================================== */}
      <div className="mb-4">
        <div className="flex space-x-2.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
          {/* Create Story Card (First Card with Real Current User Avatar) */}
          <div
            onClick={() => setShowCreateStoryModal(true)}
            className="flex-shrink-0 w-[105px] h-[155px] rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-2xs cursor-pointer hover:shadow-md transition-all relative flex flex-col group active:scale-98"
          >
            {/* Top Half (User Profile Avatar) */}
            <div className="h-[105px] w-full bg-gradient-to-br from-indigo-50 to-purple-100 relative overflow-hidden flex items-center justify-center">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#6C63FF] text-white text-lg font-bold flex items-center justify-center">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Plus Floating Button */}
            <div className="absolute top-[88px] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#6C63FF] border-[3px] border-white text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>

            {/* Bottom Half Label */}
            <div className="flex-1 bg-white pt-4 pb-1.5 px-1 flex items-center justify-center text-center">
              <span className="text-[11px] font-bold text-gray-800 leading-tight">
                បង្កើត Story
              </span>
            </div>
          </div>

          {/* Active Stories List */}
          {realtimeStories.map((story, index) => {
            const isMine = story.userId === currentUser.id;
            return (
              <div
                key={story.id}
                onClick={() => handleOpenStoryViewer(index)}
                className="flex-shrink-0 w-[105px] h-[155px] rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all relative cursor-pointer group active:scale-98 border border-gray-100"
              >
                {/* Story Thumbnail / Background */}
                {story.type === "image" && story.imageUrl ? (
                  <img
                    src={story.imageUrl}
                    alt={story.userName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${
                      story.bgColor || "from-[#6C63FF] to-[#3B82F6]"
                    } p-2 flex items-center justify-center text-center text-white text-[10px] font-semibold leading-snug`}
                  >
                    <span className="line-clamp-4">{story.text}</span>
                  </div>
                )}

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

                {/* Top User Avatar with Ring */}
                <div className="absolute top-2 left-2 pointer-events-none">
                  <div className="w-7 h-7 rounded-full ring-2 ring-[#6C63FF] ring-offset-1 ring-offset-black/20 overflow-hidden bg-white flex items-center justify-center text-[10px] font-bold text-[#6C63FF]">
                    {story.userAvatar ? (
                      <img
                        src={story.userAvatar}
                        alt={story.userName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{story.userName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                {/* Bottom Details */}
                <div className="absolute bottom-2 left-2 right-2 pointer-events-none text-white">
                  <p className="text-[11px] font-bold truncate drop-shadow-xs leading-tight">
                    {isMine ? "Story របស់អ្នក" : story.userName}
                  </p>
                  <p className="text-[9px] text-white/80 font-medium">
                    {formatKhmerRelativeTime(story.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          2. FACEBOOK-STYLE CREATE POST BAR
          ======================================================== */}
      <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs mb-4">
        <div className="flex items-center space-x-2.5 pb-2.5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 overflow-hidden flex-shrink-0">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#6C63FF] text-white font-bold text-xs flex items-center justify-center">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowCreatePostModal(true)}
            className="flex-1 bg-gray-100 hover:bg-gray-200/80 transition-colors text-left px-3.5 py-2 rounded-full text-[12px] text-gray-500 font-medium truncate"
          >
            តើ {currentUser.name} កំពុងគិតអ្វី?...
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-3 gap-1 pt-2">
          <button
            onClick={() => {
              setShowCreatePostModal(true);
              setTimeout(() => postFileInputRef.current?.click(), 150);
            }}
            className="flex items-center justify-center space-x-1.5 py-1.5 rounded-xl hover:bg-green-50 text-green-600 transition-colors text-[11px] font-bold"
          >
            <ImageIcon className="w-4 h-4 text-green-500" />
            <span>រូបភាព</span>
          </button>

          <button
            onClick={() => {
              setShowCreatePostModal(true);
              handleGeneratePostCaption();
            }}
            className="flex items-center justify-center space-x-1.5 py-1.5 rounded-xl hover:bg-indigo-50 text-[#6C63FF] transition-colors text-[11px] font-bold"
          >
            <Sparkles className="w-4 h-4 text-[#6C63FF]" />
            <span>តែងដោយ AI</span>
          </button>

          <button
            onClick={() => setShowCreatePostModal(true)}
            className="flex items-center justify-center space-x-1.5 py-1.5 rounded-xl hover:bg-amber-50 text-amber-600 transition-colors text-[11px] font-bold"
          >
            <Smile className="w-4 h-4 text-amber-500" />
            <span>អារម្មណ៍</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          3. REAL-TIME POSTS FEED (Facebook Style)
          ======================================================== */}
      <div className="space-y-3.5">
        {isLoadingFeed ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-2xs flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
            <p className="text-xs text-gray-500 font-medium">
              កំពុងទាញយកទំព័រព័ត៌មានផ្ទាល់...
            </p>
          </div>
        ) : realtimePosts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-2xs text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#6C63FF] mx-auto flex items-center justify-center mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-[14px] font-bold text-gray-900 mb-1">
              មិនទាន់មានការបង្ហោះនៅឡើយទេ
            </h3>
            <p className="text-[12px] text-gray-500 max-w-xs mx-auto mb-4">
              ក្លាយជាអ្នកដំបូងគេដែលចែករំលែក status ឬរូបភាពដ៏ស្រស់ស្អាតលើ Hugi!
            </p>
            <button
              onClick={() => setShowCreatePostModal(true)}
              className="bg-[#6C63FF] hover:bg-[#5a51e6] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              បង្ហោះ Status ឥឡូវនេះ
            </button>
          </div>
        ) : (
          realtimePosts.map((post) => {
            const isLiked = post.likes.includes(currentUser.id);
            const isMyPost = post.userId === currentUser.id;
            const isCommentsOpen = activeCommentPostId === post.id;
            const commentsList = post.comments || [];

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden transition-all"
              >
                {/* Post Author Header */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 overflow-hidden flex-shrink-0">
                      {post.userAvatar ? (
                        <img
                          src={post.userAvatar}
                          alt={post.userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#6C63FF] text-white font-bold text-sm flex items-center justify-center">
                          {post.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-[13px] font-bold text-gray-900 leading-tight">
                          {post.userName}
                        </h4>
                        {post.userUsername && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            @{post.userUsername.replace(/^@/, "")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 mt-0.5">
                        <span>{formatKhmerRelativeTime(post.createdAt)}</span>
                        <span>•</span>
                        <Globe className="w-3 h-3 text-gray-400" />
                        <span>សាធារណៈ</span>
                      </div>
                    </div>
                  </div>

                  {/* Post Options Menu */}
                  {isMyPost && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="លុបការបង្ហោះ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Post Text Content */}
                {post.text && (
                  <div className="px-3.5 pb-3">
                    <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {post.text}
                    </p>
                  </div>
                )}

                {/* Attached Image with Lightbox Trigger */}
                {post.imageUrl && (
                  <div
                    onClick={() => setLightboxImage(post.imageUrl!)}
                    className="w-full max-h-[420px] bg-gray-950 overflow-hidden cursor-pointer flex items-center justify-center group"
                  >
                    <img
                      src={post.imageUrl}
                      alt="Post Attachment"
                      className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                    />
                  </div>
                )}

                {/* Interaction Counters Bar */}
                <div className="px-3.5 py-2 flex items-center justify-between text-[11px] text-gray-500 border-b border-gray-100">
                  <div className="flex items-center space-x-1">
                    {post.likes.length > 0 && (
                      <span className="flex items-center space-x-1">
                        <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px]">
                          ❤️
                        </span>
                        <span className="font-semibold text-gray-700">
                          {post.likes.length} នាក់
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-gray-500">
                    <span>{commentsList.length} មតិយោបល់</span>
                  </div>
                </div>

                {/* Action Bar (Like, Comment, Share) */}
                <div className="px-2 py-1 grid grid-cols-3 gap-1 border-b border-gray-100">
                  <button
                    onClick={() => handleToggleLikePost(post.id)}
                    className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-xl transition-all text-[12px] font-bold ${
                      isLiked
                        ? "text-red-500 bg-red-50"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isLiked ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                    <span>{isLiked ? "បានចូលចិត្ត" : "ចូលចិត្ត"}</span>
                  </button>

                  <button
                    onClick={() =>
                      setActiveCommentPostId(isCommentsOpen ? null : post.id)
                    }
                    className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-xl transition-all text-[12px] font-bold ${
                      isCommentsOpen
                        ? "text-[#6C63FF] bg-indigo-50"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>មតិយោបល់</span>
                  </button>

                  <button
                    onClick={() => handleSharePost(post)}
                    className="flex items-center justify-center space-x-1.5 py-1.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-[12px] font-bold"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>ចែករំលែក</span>
                  </button>
                </div>

                {/* Comments Section (Expandable) */}
                {isCommentsOpen && (
                  <div className="p-3 bg-gray-50/80 space-y-3">
                    {/* Comments List */}
                    {commentsList.length > 0 ? (
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {commentsList.map((cmt) => (
                          <div
                            key={cmt.id}
                            className="flex items-start space-x-2"
                          >
                            <div className="w-7 h-7 rounded-full bg-indigo-100 overflow-hidden flex-shrink-0 mt-0.5">
                              {cmt.userAvatar ? (
                                <img
                                  src={cmt.userAvatar}
                                  alt={cmt.userName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-[#6C63FF] text-white text-[10px] font-bold flex items-center justify-center">
                                  {cmt.userName.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 bg-white p-2.5 rounded-2xl rounded-tl-xs border border-gray-100 shadow-2xs">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[11px] font-bold text-gray-900">
                                  {cmt.userName}
                                </span>
                                <span className="text-[9px] text-gray-400">
                                  {formatKhmerRelativeTime(cmt.createdAt)}
                                </span>
                              </div>
                              <p className="text-[12px] text-gray-800 leading-snug">
                                {cmt.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-[11px] text-gray-400 py-1">
                        មិនទាន់មានមតិយោបល់នៅឡើយទេ។ បញ្ចេញមតិដំបូងគេ!
                      </p>
                    )}

                    {/* New Comment Input Box */}
                    <div className="flex items-center space-x-2 pt-1">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 overflow-hidden flex-shrink-0">
                        {currentUser.avatar ? (
                          <img
                            src={currentUser.avatar}
                            alt={currentUser.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#6C63FF] text-white text-[10px] font-bold flex items-center justify-center">
                            {currentUser.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={commentInputMap[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputMap({
                            ...commentInputMap,
                            [post.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment(post.id);
                        }}
                        placeholder="សរសេរមតិយោបល់របស់អ្នក..."
                        className="flex-1 bg-white border border-gray-200 rounded-full px-3.5 h-[34px] text-[12px] focus:outline-none focus:border-[#6C63FF]"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={
                          !commentInputMap[post.id]?.trim() ||
                          isSubmittingComment
                        }
                        className="w-[34px] h-[34px] rounded-full bg-[#6C63FF] text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================
          4. FULLSCREEN STORY VIEWER MODAL
          ======================================================== */}
      {currentActiveStory && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between max-w-md mx-auto h-screen animate-in fade-in duration-200">
          {/* Top Progress Segmented Bars */}
          <div className="p-3 z-20 flex flex-col space-y-2">
            <div className="flex space-x-1.5 w-full">
              {realtimeStories.map((_, i) => (
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

            {/* Author Header Info */}
            <div className="flex items-center justify-between text-white mt-1">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full ring-2 ring-white overflow-hidden bg-[#6C63FF] text-white font-bold flex items-center justify-center text-xs">
                  {currentActiveStory.userAvatar ? (
                    <img
                      src={currentActiveStory.userAvatar}
                      alt={currentActiveStory.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {currentActiveStory.userName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-[13px] leading-tight">
                    {currentActiveStory.userName}
                  </h4>
                  <p className="text-[10px] text-white/80">
                    {formatKhmerRelativeTime(currentActiveStory.createdAt)} •
                    24h story
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {currentActiveStory.userId === currentUser.id && (
                  <button
                    onClick={() => handleDeleteStory(currentActiveStory.id)}
                    className="p-1.5 hover:bg-red-500/30 rounded-full text-white/90 hover:text-red-400"
                    title="លុប Story នេះ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleCloseStoryViewer}
                  className="p-1.5 hover:bg-white/20 rounded-full text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Touch navigation zones */}
          <div
            className="absolute inset-y-0 left-0 w-1/4 z-10"
            onClick={handlePrevStory}
          />
          <div
            className="absolute inset-y-0 right-0 w-1/4 z-10"
            onClick={handleNextStory}
          />

          {/* Story Main Content */}
          <div className="flex-1 relative flex items-center justify-center p-4">
            {currentActiveStory.type === "image" &&
            currentActiveStory.imageUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={currentActiveStory.imageUrl}
                  alt="Story"
                  className="max-h-full max-w-full object-contain rounded-2xl"
                />
                {currentActiveStory.text && (
                  <div className="absolute bottom-6 left-4 right-4 bg-black/60 backdrop-blur-xs text-white p-3 rounded-2xl text-center text-xs font-medium leading-relaxed">
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

            {/* Heart Animation */}
            {showHeartAnimation && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping duration-500">
                <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-lg" />
              </div>
            )}
          </div>

          {/* Viewer Bottom Reaction & Reply */}
          <div className="p-3 z-20 bg-gradient-to-t from-black/90 to-transparent flex flex-col space-y-2">
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

      {/* ========================================================
          5. CREATE STORY MODAL
          ======================================================== */}
      {showCreateStoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 border border-gray-100 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowCreateStoryModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-[14px] text-gray-900 mb-3">
              បង្កើត Story ថ្មី (Realtime 24h)
            </h3>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-xl mb-3">
              <button
                onClick={() => setStoryCreateType("text")}
                className={`py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                  storyCreateType === "text"
                    ? "bg-white text-[#6C63FF] shadow-2xs"
                    : "text-gray-500"
                }`}
              >
                អត្ថបទ (Text)
              </button>
              <button
                onClick={() => {
                  setStoryCreateType("image");
                  if (!storyImagePreview) storyFileInputRef.current?.click();
                }}
                className={`py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                  storyCreateType === "image"
                    ? "bg-white text-[#6C63FF] shadow-2xs"
                    : "text-gray-500"
                }`}
              >
                រូបភាព (Photo)
              </button>
            </div>

            {/* Text Mode Editor */}
            {storyCreateType === "text" ? (
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
              /* Image Mode Editor */
              <div className="space-y-3">
                <div
                  onClick={() => storyFileInputRef.current?.click()}
                  className="w-full aspect-[4/3] rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
                >
                  {storyImagePreview ? (
                    <img
                      src={storyImagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-[11px] font-medium">
                        ចុចដើម្បីជ្រើសរើសរូបភាព
                      </span>
                    </div>
                  )}
                </div>

                <input
                  ref={storyFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleStoryImageSelect}
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

            {/* AI Assist Button */}
            <button
              onClick={handleGenerateStoryCaption}
              disabled={isGeneratingStoryCaption}
              className="w-full mt-2.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-[#6C63FF] rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-colors border border-indigo-100"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isGeneratingStoryCaption
                  ? "កំពុងតែង Caption ដោយ AI..."
                  : "បង្កើត Caption ស្វ័យប្រវត្តិតាមរយៈ AI"}
              </span>
            </button>

            {/* Submit Button */}
            <button
              onClick={handlePublishStory}
              disabled={
                isPublishingStory ||
                (storyCreateType === "text"
                  ? !storyText.trim()
                  : !storyImagePreview)
              }
              className="w-full mt-3 bg-[#6C63FF] hover:bg-[#5a51e6] text-white font-bold py-2.5 rounded-xl text-[13px] transition-all shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isPublishingStory ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>កំពុងបង្ហោះ Story...</span>
                </>
              ) : (
                <span>បង្ហោះ Story ឥឡូវនេះ (24 ម៉ោង)</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          6. CREATE POST MODAL (Facebook Style)
          ======================================================== */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 border border-gray-100 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowCreatePostModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-[15px] text-gray-900 mb-3 text-center border-b border-gray-100 pb-2.5">
              បង្កើតការបង្ហោះថ្មី (Create Post)
            </h3>

            {/* User Details Header */}
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 overflow-hidden flex-shrink-0">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#6C63FF] text-white font-bold text-sm flex items-center justify-center">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-gray-900 leading-tight">
                  {currentUser.name}
                </h4>
                <div className="flex items-center space-x-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full w-fit mt-0.5 font-medium">
                  <Globe className="w-2.5 h-2.5" />
                  <span>សាធារណៈ</span>
                </div>
              </div>
            </div>

            {/* Main Textarea */}
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder={`តើ ${currentUser.name} កំពុងគិតអ្វី? ចែករំលែកជាមួយមិត្តភក្តិរបស់អ្នក...`}
              rows={4}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[13px] text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-[#6C63FF]"
            />

            {/* Image Preview Box if attached */}
            {postImagePreview && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-gray-200 max-h-48">
                <img
                  src={postImagePreview}
                  alt="Post preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    setPostImageFile(null);
                    setPostImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full shadow-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <input
              ref={postFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePostImageSelect}
            />

            {/* Attachments & AI Assist Action Box */}
            <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-600 pl-1">
                បន្ថែមទៅការបង្ហោះរបស់អ្នក
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => postFileInputRef.current?.click()}
                  className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                  title="បន្ថែមរូបភាព"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleGeneratePostCaption}
                  disabled={isGeneratingPostCaption}
                  className="p-1.5 rounded-lg hover:bg-indigo-50 text-[#6C63FF] transition-colors"
                  title="ជំនួយការតែងអត្ថបទ AI"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Submit Post Button */}
            <button
              onClick={handlePublishPost}
              disabled={
                isPublishingPost || (!postText.trim() && !postImagePreview)
              }
              className="w-full mt-3 bg-[#6C63FF] hover:bg-[#5a51e6] text-white font-bold py-2.5 rounded-xl text-[13px] transition-all shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isPublishingPost ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>កំពុងបង្ហោះ Status...</span>
                </>
              ) : (
                <span>បង្ហោះឥឡូវនេះ (Post)</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          7. IMAGE LIGHTBOX MODAL
          ======================================================== */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 bg-black/50 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Expanded view"
            className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
