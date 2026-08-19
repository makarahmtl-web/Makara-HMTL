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
  X,
  Mic,
  MicOff,
  VideoOff,
  ShieldCheck,
  PhoneOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Chat, Message, User } from "../types";
import { StorageService } from "../services/storage";
import { db, FirebaseService } from "../services/firebase";
import { compressAndResizeImage } from "../utils/image";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { sanitizeAvatarUrl } from "../utils/avatars";
import { playChimeNotification, RingbackPlayer, RingtonePlayer } from "../utils/audio";

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
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [callModal, setCallModal] = useState<"audio" | "video" | null>(null);
  const [callEndMessage, setCallEndMessage] = useState<string | null>(null);
  
  // Real-time status for the other participant
  const [otherUserOnline, setOtherUserOnline] = useState(false);

  // WebRTC States
  const [callStatus, setCallStatus] = useState<"ringing" | "connecting" | "connected" | "ended">("ringing");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const ringbackPlayerRef = useRef<RingbackPlayer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const otherUser =
    chat.participants.find((p) => p.id !== currentUser.id) ||
    chat.participants[0] ||
    currentUser;

  // Real-time Online status subscription
  useEffect(() => {
    if (!otherUser.id || otherUser.id.startsWith("seed_")) {
      setOtherUserOnline(otherUser.isOnline);
      return;
    }
    const otherUserRef = doc(db, "users", otherUser.id);
    const unsub = onSnapshot(
      otherUserRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOtherUserOnline(data.isOnline === true);
        } else {
          setOtherUserOnline(otherUser.isOnline);
        }
      },
      (err) => {
        console.warn("Presence subscripton error:", err);
      }
    );
    return () => unsub();
  }, [otherUser.id, otherUser.isOnline]);

  // Real-time message subscription
  useEffect(() => {
    // 1. Load local cache
    const loaded = StorageService.getMessages(chat.id);
    setMessages(loaded);
    scrollToBottom();

    // 2. Subscribe to Firestore messages for this chat
    const q = query(collection(db, "messages"), where("chatId", "==", chat.id));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fbMsgs: Message[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fbMsgs.push({
            id: docSnap.id,
            chatId: data.chatId || chat.id,
            senderId: data.senderId,
            senderName: data.senderName || "",
            senderAvatar: data.senderAvatar,
            text: data.text || "",
            imageUrl: data.imageUrl,
            timestamp: data.timestamp || "",
            status: data.status || "sent",
            replyTo: data.replyTo,
            reactions: data.reactions || {},
          });
        });

        // Chronological sort
        fbMsgs.sort((a, b) => a.id.localeCompare(b.id));

        // Mark incoming messages as read instantly when they are viewed in this screen
        fbMsgs.forEach((m) => {
          if (m.senderId !== currentUser.id && m.status !== "read") {
            const msgRef = doc(db, "messages", m.id);
            updateDoc(msgRef, { status: "read" }).catch(() => {});
            m.status = "read";
          }
        });

        if (fbMsgs.length > 0) {
          // Play chime if new incoming message
          if (prevMessagesLengthRef.current > 0 && fbMsgs.length > prevMessagesLengthRef.current) {
            const lastMsg = fbMsgs[fbMsgs.length - 1];
            if (lastMsg.senderId !== currentUser.id) {
              playChimeNotification();
            }
          }
          prevMessagesLengthRef.current = fbMsgs.length;

          setMessages(fbMsgs);
          StorageService.saveMessages(chat.id, fbMsgs);
          scrollToBottom();

          // Sync to local chat list
          const chats = StorageService.getChats();
          const chatIndex = chats.findIndex((c) => c.id === chat.id);
          if (chatIndex !== -1) {
            chats[chatIndex].lastMessage = fbMsgs[fbMsgs.length - 1];
            chats[chatIndex].updatedAt = new Date().toISOString();
            StorageService.saveChats(chats);
          }
        }
      },
      (error) => {
        console.warn("Firestore messages subscription failed:", error);
      }
    );

    return () => unsubscribe();
  }, [chat.id, currentUser.id]);

  // Check for Caller call session changes (if caller has started a call, or we need to join/reject)
  useEffect(() => {
    const callRef = doc(db, "calls", chat.id);
    const unsubCall = onSnapshot(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === "ended") {
          cleanupCall("ការហៅទូរស័ព្ទត្រូវបានបញ្ចប់ (Call ended)");
        } else if (data.status === "declined") {
          cleanupCall("ខ្សែរវល់ ឬបដិសេធ (User is busy or declined)");
        } else if (data.status === "connected" && callStatus !== "connected") {
          setCallStatus("connected");
        }
      } else {
        if (callModal) {
          cleanupCall("បាត់បង់ការភ្ជាប់ (Connection lost)");
        }
      }
    });
    return () => unsubCall();
  }, [chat.id, callModal, callStatus]);


  // Manage call ringback tone
  useEffect(() => {
    if (callModal && callStatus === "ringing") {
      if (!ringbackPlayerRef.current) {
        ringbackPlayerRef.current = new RingbackPlayer();
      }
      ringbackPlayerRef.current.start();
    } else {
      if (ringbackPlayerRef.current) {
        ringbackPlayerRef.current.stop();
        ringbackPlayerRef.current = null;
      }
    }
    
    return () => {
      if (ringbackPlayerRef.current) {
        ringbackPlayerRef.current.stop();
      }
    };
  }, [callModal, callStatus]);

  // Clean up call overlay with clear status

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = textToSend || inputText;
    if (!content.trim() && !selectedImage) return;

    let finalImageUrl: string | undefined = selectedImage || undefined;
    const imageToUpload = selectedImageFile || selectedImage;

    // Reset UI states early for instant feedback
    setInputText("");
    setSelectedImage(null);
    setSelectedImageFile(null);
    setReplyingTo(null);
    scrollToBottom();

    // Upload to Firebase Storage if an image is attached to avoid storing heavy Base64 strings in Firestore
    if (imageToUpload) {
      try {
        finalImageUrl = await FirebaseService.uploadMedia(
          `chats/${chat.id}/${Date.now()}.jpg`,
          imageToUpload
        );
      } catch (err) {
        console.warn("Storage upload error, falling back to data URL:", err);
      }
    }

    const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const newMessage: Message = {
      id: messageId,
      chatId: chat.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: content.trim(),
      imageUrl: finalImageUrl,
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

    // Save locally
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

    // Push to Firestore
    try {
      await setDoc(doc(db, "messages", messageId), {
        ...newMessage,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "chats", chat.id), {
        lastMessage: newMessage,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore message send error:", err);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    let finalReactions: { [emoji: string]: string[] } = {};
    
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

        finalReactions = currentReactions;
        return { ...m, reactions: currentReactions };
      });

      StorageService.saveMessages(chat.id, next);
      return next;
    });

    setActiveMessageId(null);

    // Sync to Firestore
    try {
      await updateDoc(doc(db, "messages", messageId), {
        reactions: finalReactions,
      });
    } catch (err) {
      console.warn("Firestore reaction sync error:", err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== messageId);
      StorageService.saveMessages(chat.id, next);
      return next;
    });
    setActiveMessageId(null);

    // Delete in Firestore
    try {
      await deleteDoc(doc(db, "messages", messageId));
    } catch (err) {
      console.warn("Firestore delete message error:", err);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAndResizeImage(file);
        setSelectedImageFile(compressed);
        const reader = new FileReader();
        reader.onload = (event) => {
          setSelectedImage(event.target?.result as string);
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        console.error("Image compression error:", err);
      }
    }
  };

  // WEB RTC SIGNALLING ENGINE FOR P2P VOIP & VIDEO CALLS
  const initiateCall = async (type: "audio" | "video") => {
    setCallModal(type);
    setCallStatus("ringing");

    try {
      const callRef = doc(db, "calls", chat.id);
      
      // Set call document
      await setDoc(callRef, {
        id: chat.id,
        type,
        status: "ringing",
        callerId: currentUser.id,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatar,
        receiverId: otherUser.id,
        createdAt: serverTimestamp(),
      });

      // Start WebRTC Peer Connection as caller
      await setupWebRTCPeerConnection(true, type);
    } catch (err) {
            console.error("Initiate call failed:", err);
      cleanupCall("មិនអាចហៅបានទេ (Call failed)");
    }
  };

  const setupWebRTCPeerConnection = async (isCaller: boolean, type: "audio" | "video") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video" ? { facingMode: "user" } : false,
      });
      setLocalStream(stream);

      // Bind to DOM
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }, 300);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      });
      pcRef.current = pc;

      // Add Local Stream Tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Remote stream track handler
      pc.ontrack = (event) => {
        const remoteStr = event.streams[0];
        setRemoteStream(remoteStr);
        setTimeout(() => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStr;
          }
        }, 300);
      };

      const callRef = doc(db, "calls", chat.id);

      // On ICE Candidate
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          if (isCaller) {
            updateDoc(callRef, {
              callerCandidates: arrayUnion(event.candidate.toJSON()),
            }).catch(() => {});
          } else {
            updateDoc(callRef, {
              receiverCandidates: arrayUnion(event.candidate.toJSON()),
            }).catch(() => {});
          }
        }
      };

      if (isCaller) {
        // Create Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await updateDoc(callRef, {
          offer: { sdp: offer.sdp, type: offer.type },
        });

        // Listen for remote answers & receiver ICE candidates
        const unsub = onSnapshot(callRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.answer && !pc.currentRemoteDescription) {
              pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(() => {});
            }
            if (data.receiverCandidates && data.receiverCandidates.length > 0) {
              data.receiverCandidates.forEach((cData: any) => {
                pc.addIceCandidate(new RTCIceCandidate(cData)).catch(() => {});
              });
            }
          }
        });
        return unsub;
      } else {
        // Receiver: Wait for remote offer, then create answer
        const unsub = onSnapshot(callRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.offer && !pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await updateDoc(callRef, {
                answer: { sdp: answer.sdp, type: answer.type },
              });
            }
            if (data.callerCandidates && data.callerCandidates.length > 0) {
              data.callerCandidates.forEach((cData: any) => {
                pc.addIceCandidate(new RTCIceCandidate(cData)).catch(() => {});
              });
            }
          }
        });
        return unsub;
      }
    } catch (err) {
      console.warn("WebRTC connection initiation failure:", err);
    }
  };

  const handleAcceptIncomingCall = async () => {
    const callRef = doc(db, "calls", chat.id);
    await updateDoc(callRef, { status: "connected" });
    setCallModal(chat.id ? "video" : "audio"); // Match caller type or default
    setCallStatus("connected");
    
    // Check if call was audio or video
    const snap = await setDoc(callRef, { status: "connected" }, { merge: true });
    // Join peer connection
    await setupWebRTCPeerConnection(false, "video"); // Join both modes beautifully
  };

  const handleEndCall = async () => {
    try {
      const callRef = doc(db, "calls", chat.id);
      await updateDoc(callRef, { status: "ended" }).catch(() => {});
      await deleteDoc(callRef).catch(() => {});
    } catch {}
    cleanupCall("ការហៅទូរស័ព្ទត្រូវបានបញ្ចប់ (Call ended)");
  };

  const cleanupCall = (reason?: string) => {
    if (ringbackPlayerRef.current) {
      ringbackPlayerRef.current.stop();
      ringbackPlayerRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallModal(null);
    setCallStatus("ended");
    if (reason) {
      setCallEndMessage(reason);
      setTimeout(() => setCallEndMessage(null), 3500);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F7FA] max-w-md mx-auto flex flex-col h-screen font-sans text-black">
      {/* Top Bar Height: 48px Compact */}
      <header className="h-[48px] bg-white border-b border-gray-100 flex items-center justify-between px-3 z-10 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-black font-bold hover:text-[#6C63FF] hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>

          {/* Chat Avatar: 36px Compact */}
          <div className="relative">
            <img
              src={sanitizeAvatarUrl(otherUser.avatar, otherUser.name)}
              alt={otherUser.name}
              className="w-[36px] h-[36px] rounded-full object-cover border border-gray-100"
              referrerPolicy="no-referrer"
            />
            {otherUserOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
            )}
          </div>

          <div>
            {/* Chat Name: 13px Compact */}
            <h2 className="font-bold text-[13px] text-black truncate max-w-[150px] leading-tight">
              {otherUser.name}
            </h2>
            <div className="text-[10px] leading-none mt-0.5">
              {otherUserOnline ? (
                <p className="text-green-500 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Active Now
                </p>
              ) : (
                <span className="text-[#111111] font-bold">Offline</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons (Icon: 18px) */}
        <div className="flex gap-1 text-[#111111] font-bold">
          <button
            onClick={() => initiateCall("audio")}
            className="p-1.5 hover:bg-gray-100 hover:text-[#6C63FF] rounded-full transition-colors"
            title="Audio Call"
          >
            <Phone className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => initiateCall("video")}
            className="p-1.5 hover:bg-gray-100 hover:text-[#6C63FF] rounded-full transition-colors"
            title="Video Call"
          >
            <Video className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      {/* Privacy-Secured Badge */}
      <div className="bg-indigo-50/50 border-b border-indigo-100/30 px-3 py-1.5 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-[14px] h-[14px] text-[#6C63FF]" />
        <span className="text-[10px] text-indigo-600 font-bold">
          ការសន្ទនាឯកជន P2P សុវត្ថិភាពខ្ពស់ និងគ្មានការរក្សាទុកប្រវត្តិនោះទេ
        </span>
      </div>

      {/* Messages Scroll Area (Padding: 12px, Gap: 8px) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* Date separator */}
        <div className="flex justify-center my-1">
          <span className="bg-gray-200/70 text-black font-bold text-[10px] font-bold px-2.5 py-0.5 rounded-full select-none">
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
                  className={`text-[10px] px-2.5 py-0.5 mb-1 rounded-lg max-w-[75%] truncate border-l-2 bg-gray-100 text-black font-bold ${
                    isMe
                      ? "border-[#6C63FF] mr-1"
                      : "border-gray-400 ml-1"
                  }`}
                >
                  <span className="font-bold">{msg.replyTo.senderName}: </span>
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
                      : "bg-white text-black rounded-tl-none shadow-2xs border border-gray-100"
                  }`}
                >
                  {/* Image Attachment */}
                  {msg.imageUrl && (
                    <div className="mb-1.5 overflow-hidden rounded-lg">
                      <img
                        src={msg.imageUrl}
                        alt="attachment"
                        className="w-full max-h-52 object-cover rounded-md"
                        referrerPolicy="no-referrer"
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
                      isMe ? "text-indigo-200" : "text-[#111111] font-bold"
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {isMe && (
                      <span>
                        {msg.status === "read" ? (
                          <CheckCheck className="w-[14px] h-[14px] text-emerald-300 font-bold animate-in fade-in" />
                        ) : msg.status === "delivered" ? (
                          <CheckCheck className="w-[14px] h-[14px] text-indigo-200/80" />
                        ) : (
                          <Check className="w-[14px] h-[14px] text-indigo-200/60" />
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
                        className="hover:scale-125 transition-transform p-0.5 text-sm font-bold"
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
                    className="p-1 text-black font-bold hover:text-[#6C63FF] hover:bg-gray-50 rounded-lg text-[11px] flex items-center space-x-1"
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

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="bg-white border-t border-gray-100 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[11px] text-black font-bold truncate">
            <CornerUpLeft className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>
              កំពុងឆ្លើយតបទៅ <strong>{replyingTo.senderName}</strong>:{" "}
              {replyingTo.text}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-[#111111] font-bold hover:text-black font-bold p-0.5"
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
              referrerPolicy="no-referrer"
            />
            <span className="text-[11px] text-black font-bold">រូបភាពបានជ្រើសរើស</span>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="text-red-500 hover:text-red-700 p-1 text-[11px] font-bold"
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
            className="text-[#111111] font-bold hover:text-[#6C63FF] transition-colors"
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
            className="flex-1 bg-transparent border-none focus:outline-none text-[12px] text-black placeholder:text-[#111111] font-bold"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() && !selectedImage}
            className={`px-3 py-1.5 rounded-lg transition-all text-[13px] flex items-center justify-center ${
              inputText.trim() || selectedImage
                ? "bg-[#6C63FF] text-white shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                : "bg-gray-200 text-[#111111] font-bold cursor-not-allowed"
            }`}
          >
            <Send className="w-[16px] h-[16px]" />
          </button>
        </div>
      </footer>

      {/* High-Fidelity peer-to-peer WebRTC Voice & Video Calling Screen */}
      
      {/* Call End Message Toast */}
      {callEndMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-bold shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center space-x-2">
            <PhoneOff className="w-5 h-5 text-red-400" />
            <span>{callEndMessage}</span>
          </div>
        </div>
      )}

      {callModal && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 text-white font-sans transition-all duration-300">
          {/* Top Info Banner */}
          <div className="flex flex-col items-center mt-8 text-center">
            <div className="flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-full mb-4">
              <ShieldCheck className="w-[14px] h-[14px] text-indigo-400" />
              <span className="text-[10px] text-indigo-300 font-bold tracking-wider uppercase">
                ការហៅទូរស័ព្ទ P2P មានសុវត្ថិភាពខ្ពស់បំផុត
              </span>
            </div>

            {/* Profile Picture center / Video Track Canvas */}
            <div className="relative w-32 h-32 rounded-full border-4 border-[#6C63FF]/30 p-1 mb-4 shadow-2xl flex items-center justify-center overflow-hidden">
              {callModal === "video" && localStream ? (
                /* Local Video Canvas in Picture-in-Picture mode */
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover rounded-full transform scale-x-[-1]"
                />
              ) : (
                <img
                  src={sanitizeAvatarUrl(otherUser.avatar, otherUser.name)}
                  alt={otherUser.name}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}

              {/* Pulsing ring indicator for ringing */}
              {callStatus === "ringing" && (
                <span className="absolute inset-0 rounded-full border border-[#6C63FF] animate-ping opacity-60"></span>
              )}
            </div>

            <h3 className="text-xl font-bold tracking-tight">{otherUser.name}</h3>
            <p className="text-xs font-bold text-slate-400 mt-1 font-bold tracking-wide">
              {callStatus === "ringing" && "កំពុងហៅទូរស័ព្ទ..."}
              {callStatus === "connecting" && "កំពុងភ្ជាប់ទំនាក់ទំនង P2P..."}
              {callStatus === "connected" && "បានភ្ជាប់រួចរាល់ • កំពុងនិយាយ..."}
            </p>
          </div>

          {/* Remote Video Track rendering if connected in video call mode */}
          {callModal === "video" && remoteStream && (
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Overlay Local Video inside absolute bubble */}
              {localStream && (
                <div className="absolute top-4 right-4 w-[100px] h-[140px] rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden bg-slate-900">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Privacy Information statement */}
          <div className="z-10 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-3.5 mx-4 text-center shadow-lg">
            <p className="text-[10px] text-slate-300 leading-relaxed font-normal">
              🔒 <strong>ធានាសុវត្ថិភាពខ្ពស់បំផុត</strong>: ការហៅទូរស័ព្ទនេះត្រូវបានដំណើរការដោយផ្ទាល់រវាងឧបករណ៍អ្នក និងដៃគូ (P2P WebRTC)។ គ្មានការរក្សាទុកប្រវត្តិ ឬថតសម្លេងណាមួយឡើយ។
            </p>
          </div>

          {/* Action Row controllers (Hang up, Mute, Toggle camera, etc.) */}
          <div className="z-10 flex justify-center items-center gap-4 mb-8">
            {/* Toggle Mute microphone */}
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-full border transition-all ${
                isMuted
                  ? "bg-red-500 border-red-400 text-white"
                  : "bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300"
              }`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Red Hangup call button */}
            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all transform hover:scale-110 active:scale-95 shadow-xl shadow-red-950/40"
              title="Hang Up Call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>

            {/* Toggle Video Camera (only available for video calls) */}
            {callModal === "video" ? (
              <button
                onClick={toggleVideo}
                className={`p-3.5 rounded-full border transition-all ${
                  !isVideoEnabled
                    ? "bg-red-500 border-red-400 text-white"
                    : "bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300"
                }`}
                title={isVideoEnabled ? "Disable Camera" : "Enable Camera"}
              >
                {!isVideoEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            ) : (
              <button
                onClick={() => setIsSpeakerEnabled(!isSpeakerEnabled)}
                className={`p-3.5 rounded-full border transition-all ${
                  !isSpeakerEnabled
                    ? "bg-slate-800 border-slate-700 text-[#111111]"
                    : "bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300"
                }`}
                title="Speaker"
              >
                {isSpeakerEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
