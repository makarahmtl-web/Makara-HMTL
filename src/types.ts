export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  avatar?: string;
  bio: string;
  isOnline: boolean;
  showOnlineStatus: boolean;
  showPhone: boolean;
  soundEnabled: boolean;
  findableByUsername?: "everyone" | "friends" | "nobody";
  showPublicQR?: boolean;
  createdAt: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  reactions: { [emoji: string]: string[] }; // emoji -> array of userIds
}

export interface Chat {
  id: string;
  participants: User[];
  isGroup: boolean;
  name?: string;
  avatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
  createdAt?: string;
  isTyping?: boolean;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: "image" | "text";
  imageUrl?: string;
  text?: string;
  bgColor?: string;
  textColor?: string;
  createdAt: string;
  expiresAt: string;
  likes: string[];
  viewedBy: string[];
}

export interface Contact {
  id: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrl?: string;
  isGenerating?: boolean;
}

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserUsername?: string;
  fromUserAvatar?: string;
  toUserId: string;
  toUserName?: string;
  toUserUsername?: string;
  toUserAvatar?: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt?: string;
}
