import { User, Contact, Chat, Message, Story, FriendRequest } from "../types";

const USER_KEY = "hugi_current_user";
const CHATS_KEY = "hugi_chats";
const CONTACTS_KEY = "hugi_contacts";
const STORIES_KEY = "hugi_stories";
const FRIEND_REQUESTS_KEY = "hugi_friend_requests";

export const DEFAULT_USER: User = {
  id: "",
  name: "អ្នកប្រើប្រាស់ថ្មី",
  username: "user",
  email: "",
  phone: "",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  bio: "សួស្តី! ខ្ញុំប្រើប្រាស់ Hugi Chat ✨",
  isOnline: true,
  showOnlineStatus: true,
  showPhone: true,
  soundEnabled: true,
  findableByUsername: "everyone",
  showPublicQR: true,
  createdAt: new Date().toISOString(),
};

export const INITIAL_CONTACTS: Contact[] = [];

export const INITIAL_STORIES: Story[] = [];

export const INITIAL_CHATS: Chat[] = [];

export const INITIAL_MESSAGES_MAP: { [chatId: string]: Message[] } = {};

export const StorageService = {
  // Current User
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed: User = JSON.parse(raw);
      return parsed;
    } catch {
      return null;
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
      return [];
    }
    try {
      const chats: Chat[] = JSON.parse(raw);
      return chats;
    } catch {
      return [];
    }
  },

  saveChats(chats: Chat[]): void {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  },

  // Messages per chat
  getMessages(chatId: string): Message[] {
    const raw = localStorage.getItem(`hugi_messages_${chatId}`);
    if (!raw) {
      return [];
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
      return [];
    }
    try {
      const contacts: Contact[] = JSON.parse(raw);
      return contacts;
    } catch {
      return [];
    }
  },

  saveContacts(contacts: Contact[]): void {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  },

  // Stories
  getStories(): Story[] {
    const raw = localStorage.getItem(STORIES_KEY);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveStories(stories: Story[]): void {
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
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

    return null;
  },

  // Friend Requests
  getFriendRequests(): FriendRequest[] {
    const raw = localStorage.getItem(FRIEND_REQUESTS_KEY);
    if (!raw) {
      return [];
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
