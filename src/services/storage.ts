import { User, Contact, Chat, Message, Story, AIChatMessage, FriendRequest } from "../types";

const USER_KEY = "hugi_current_user";
const CHATS_KEY = "hugi_chats";
const CONTACTS_KEY = "hugi_contacts";
const STORIES_KEY = "hugi_stories";
const AI_HISTORY_KEY = "hugi_ai_history";
const FRIEND_REQUESTS_KEY = "hugi_friend_requests";

export const DEFAULT_USER: User = {
  id: "user_makara",
  name: "Makara HMTL",
  username: "makara",
  email: "makarahmtl@gmail.com",
  phone: "+855 12 345 678",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  bio: "ស្រឡាញ់ការបង្កើតបច្ចេកវិទ្យាថ្មីៗ និងការរចនា UI/UX ✨",
  isOnline: true,
  showOnlineStatus: true,
  showPhone: true,
  soundEnabled: true,
  findableByUsername: "everyone",
  showPublicQR: true,
  createdAt: new Date().toISOString(),
};

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: "c_sokha",
    name: "សុខា ភិរុណ (Sokha)",
    username: "sokha",
    phone: "+855 98 765 432",
    email: "sokha.phirun@gmail.com",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    bio: "Developer & Photographer 📸",
    isOnline: true,
    lastSeen: "កំពុងសកម្ម",
  },
  {
    id: "c_channa",
    name: "ចាន់ណា វណ្ណា (Channa)",
    username: "channa",
    phone: "+855 77 112 233",
    email: "channa.vanna@gmail.com",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    bio: "Coffee Lover & Designer ☕",
    isOnline: true,
    lastSeen: "កំពុងសកម្ម",
  },
  {
    id: "c_lida",
    name: "លីដា សោភា (Lida)",
    username: "lida",
    phone: "+855 89 445 566",
    email: "lida.sophea@gmail.com",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    bio: "Student @ RUPP 🎓",
    isOnline: false,
    lastSeen: "10 នាទីមុន",
  },
  {
    id: "c_vireak",
    name: "វីរៈ សិលា (Vireak)",
    username: "vireak",
    phone: "+855 10 998 877",
    email: "vireak.sela@gmail.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bio: "Music & Travel enthusiast 🎸",
    isOnline: false,
    lastSeen: "2 ម៉ោងមុន",
  },
  {
    id: "c_dara",
    name: "តារា រស្មី (Dara)",
    username: "dara",
    phone: "+855 15 223 344",
    email: "dara.reasmey@gmail.com",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    bio: "Hugi Community Member 🤗",
    isOnline: true,
    lastSeen: "កំពុងសកម្ម",
  },
];

export const INITIAL_STORIES: Story[] = [
  {
    id: "story_1",
    userId: "user_makara",
    userName: "Makara HMTL",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    type: "image",
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    text: "សួស្ដីថ្ងៃចន្ទ! សូមឱ្យការងារដំណើរការល្អទាំងអស់គ្នាណា៎ ☀️🌸",
    createdAt: new Date(Date.now() - 13 * 60 * 1000).toISOString(), // 13 mins ago
    expiresAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
    likes: ["c_sokha", "c_channa"],
    viewedBy: ["c_sokha", "c_channa", "c_lida"],
  },
  {
    id: "story_2",
    userId: "c_sokha",
    userName: "សុខា ភិរុណ",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    type: "image",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80",
    text: "ទេសភាពស្រស់ស្អាតនៅខេត្តកំពត 🌿⛰️ ស្រស់ស្រាយខ្លាំងណាស់!",
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
    likes: ["user_makara"],
    viewedBy: ["user_makara", "c_lida"],
  },
  {
    id: "story_3",
    userId: "c_channa",
    userName: "ចាន់ណា វណ្ណា",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    type: "text",
    text: "«ជីវិតដូចជាកាហ្វេមួយកែវ ផ្អែម ឬល្វីង អាស្រ័យលើយើងបន្ថែមស្ករ» ☕✨",
    bgColor: "from-purple-600 via-indigo-600 to-pink-500",
    textColor: "#FFFFFF",
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
    likes: ["user_makara", "c_vireak"],
    viewedBy: ["user_makara"],
  },
];

export const INITIAL_CHATS: Chat[] = [
  {
    id: "chat_sokha",
    participants: [
      DEFAULT_USER,
      {
        id: "c_sokha",
        name: "សុខា ភិរុណ (Sokha)",
        username: "sokha",
        email: "sokha.phirun@gmail.com",
        phone: "+855 98 765 432",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        bio: "Developer & Photographer",
        isOnline: true,
        showOnlineStatus: true,
        showPhone: true,
        soundEnabled: true,
        createdAt: "",
      },
    ],
    isGroup: false,
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    lastMessage: {
      id: "m_init_1",
      chatId: "chat_sokha",
      senderId: "c_sokha",
      senderName: "សុខា ភិរុណ",
      text: "សួស្ដីបង Makara! តើថ្ងៃនេះទំនេរញ៉ាំកាហ្វេជជែកគ្នាអត់? ☕",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "delivered",
      reactions: {},
    },
  },
  {
    id: "chat_channa",
    participants: [
      DEFAULT_USER,
      {
        id: "c_channa",
        name: "ចាន់ណា វណ្ណា (Channa)",
        username: "channa",
        email: "channa.vanna@gmail.com",
        phone: "+855 77 112 233",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        bio: "Designer",
        isOnline: true,
        showOnlineStatus: true,
        showPhone: true,
        soundEnabled: true,
        createdAt: "",
      },
    ],
    isGroup: false,
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    lastMessage: {
      id: "m_init_2",
      chatId: "chat_channa",
      senderId: "user_makara",
      senderName: "Makara HMTL",
      text: "ខ្ញុំបានផ្ញើ file design Hugi UI ឱ្យហើយបង!",
      timestamp: "10:30 AM",
      status: "read",
      reactions: { "❤️": ["c_channa"] },
    },
  },
];

export const INITIAL_MESSAGES_MAP: { [chatId: string]: Message[] } = {
  chat_sokha: [
    {
      id: "msg_s1",
      chatId: "chat_sokha",
      senderId: "user_makara",
      senderName: "Makara HMTL",
      text: "សួស្ដីសុខា! ការងារយ៉ាងម៉េចហើយ?",
      timestamp: "09:15 AM",
      status: "read",
      reactions: { "👍": ["c_sokha"] },
    },
    {
      id: "msg_s2",
      chatId: "chat_sokha",
      senderId: "c_sokha",
      senderName: "សុខា ភិរុណ",
      text: "បាទបង ដំណើរការរលូនល្អណាស់! កំពុងតេស្តមុខងារ AI លើ Hugi ដែរ ឆ្លើយលឿនហើយឆ្លាតខ្លាំង 🤖✨",
      timestamp: "09:18 AM",
      status: "read",
      reactions: { "❤️": ["user_makara"] },
    },
    {
      id: "msg_s3",
      chatId: "chat_sokha",
      senderId: "c_sokha",
      senderName: "សុខា ភិរុណ",
      text: "សួស្ដីបង Makara! តើថ្ងៃនេះទំនេរញ៉ាំកាហ្វេជជែកគ្នាអត់? ☕",
      timestamp: "09:20 AM",
      status: "delivered",
      reactions: {},
    },
  ],
  chat_channa: [
    {
      id: "msg_c1",
      chatId: "chat_channa",
      senderId: "c_channa",
      senderName: "ចាន់ណា វណ្ណា",
      text: "បង Makara តើ UI ពណ៌ #6C63FF មើលទៅសមរម្យទេ?",
      timestamp: "10:25 AM",
      status: "read",
      reactions: {},
    },
    {
      id: "msg_c2",
      chatId: "chat_channa",
      senderId: "user_makara",
      senderName: "Makara HMTL",
      text: "ខ្ញុំបានផ្ញើ file design Hugi UI ឱ្យហើយបង! ពណ៌ស្វាយ #6C63FF មើលទៅទំនើប និងទាក់ទាញខ្លាំងណាស់!",
      timestamp: "10:30 AM",
      status: "read",
      reactions: { "❤️": ["c_channa"] },
    },
  ],
};

export const StorageService = {
  // Current User
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      localStorage.setItem(USER_KEY, JSON.stringify(DEFAULT_USER));
      return DEFAULT_USER;
    }
    try {
      const parsed: User = JSON.parse(raw);
      if (!parsed.username) {
        parsed.username = "makara";
      }
      if (!parsed.findableByUsername) {
        parsed.findableByUsername = "everyone";
      }
      if (parsed.showPublicQR === undefined) {
        parsed.showPublicQR = true;
      }
      return parsed;
    } catch {
      return DEFAULT_USER;
    }
  },

  setUser(user: User | null): void {
    if (!user) {
      localStorage.removeItem(USER_KEY);
    } else {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  saveUser(user: User | null): void {
    this.setUser(user);
  },

  logout(): void {
    localStorage.removeItem(USER_KEY);
  },

  clearAll(): void {
    localStorage.clear();
  },

  // Chats
  getChats(): Chat[] {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) {
      localStorage.setItem(CHATS_KEY, JSON.stringify(INITIAL_CHATS));
      return INITIAL_CHATS;
    }
    try {
      const chats: Chat[] = JSON.parse(raw);
      // Ensure participants have usernames
      return chats.map((c) => ({
        ...c,
        participants: c.participants.map((p) => ({
          ...p,
          username: p.username || (p.id === "user_makara" ? "makara" : p.id.replace(/^c_/, "")),
        })),
      }));
    } catch {
      return INITIAL_CHATS;
    }
  },

  saveChats(chats: Chat[]): void {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  },

  // Messages per chat
  getMessages(chatId: string): Message[] {
    const raw = localStorage.getItem(`hugi_messages_${chatId}`);
    if (!raw) {
      const init = INITIAL_MESSAGES_MAP[chatId] || [];
      localStorage.setItem(`hugi_messages_${chatId}`, JSON.stringify(init));
      return init;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveMessages(chatId: string, messages: Message[]): void {
    localStorage.setItem(`hugi_messages_${chatId}`, JSON.stringify(messages));
  },

  // Contacts
  getContacts(): Contact[] {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (!raw) {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(INITIAL_CONTACTS));
      return INITIAL_CONTACTS;
    }
    try {
      const contacts: Contact[] = JSON.parse(raw);
      return contacts.map((c) => ({
        ...c,
        username: c.username || c.id.replace(/^c_/, "").toLowerCase(),
      }));
    } catch {
      return INITIAL_CONTACTS;
    }
  },

  saveContacts(contacts: Contact[]): void {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  },

  // Stories
  getStories(): Story[] {
    const raw = localStorage.getItem(STORIES_KEY);
    if (!raw) {
      localStorage.setItem(STORIES_KEY, JSON.stringify(INITIAL_STORIES));
      return INITIAL_STORIES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_STORIES;
    }
  },

  saveStories(stories: Story[]): void {
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  },

  // Hugi AI History
  getAIHistory(): AIChatMessage[] {
    const raw = localStorage.getItem(AI_HISTORY_KEY);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveAIHistory(history: AIChatMessage[]): void {
    localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history));
  },

  // Username validation and lookup
  isUsernameAvailable(username: string, currentUserId?: string): boolean {
    const clean = username.trim().toLowerCase().replace(/^@/, "");
    if (!clean || clean.length < 3) return false;

    const currentUser = this.getUser();
    if (currentUser && currentUser.id !== currentUserId && currentUser.username?.toLowerCase() === clean) {
      return false;
    }

    const contacts = this.getContacts();
    const existing = contacts.find(
      (c) => c.id !== currentUserId && c.username?.toLowerCase() === clean
    );
    return !existing;
  },

  findUserByUsername(query: string): Contact | User | null {
    const clean = query.trim().toLowerCase().replace(/^@/, "");
    if (!clean) return null;

    const currentUser = this.getUser();
    if (currentUser && currentUser.username?.toLowerCase() === clean) {
      return currentUser;
    }

    const contacts = this.getContacts();
    const foundContact = contacts.find((c) => c.username?.toLowerCase() === clean);
    if (foundContact) return foundContact;

    // Check INITIAL_CONTACTS as well in case contact was deleted or not yet added
    const fallback = INITIAL_CONTACTS.find((c) => c.username?.toLowerCase() === clean);
    if (fallback) return fallback;

    return null;
  },

  // Friend Requests
  getFriendRequests(): FriendRequest[] {
    const raw = localStorage.getItem(FRIEND_REQUESTS_KEY);
    if (!raw) {
      // Provide a couple initial demo requests to demonstrate Accept/Decline flow
      const initial: FriendRequest[] = [
        {
          id: "req_demo_sokha",
          fromUserId: "c_sokha",
          fromUserName: "សុខា ភិរុណ (Sokha)",
          fromUserUsername: "sokha",
          fromUserAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
          toUserId: "user_makara",
          status: "pending",
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
      ];
      this.saveFriendRequests(initial);
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveFriendRequests(requests: FriendRequest[]): void {
    localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(requests));
  },
};
