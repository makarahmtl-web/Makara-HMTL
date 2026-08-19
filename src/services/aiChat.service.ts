import {
  db,
} from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  writeBatch,
} from "firebase/firestore";

export interface AIChatSession {
  id: string;
  chatId: string;
  title: string;
  createdAt: any;
  updatedAt: any;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: any;
  }>;
}

/**
 * AI Chat Firestore Service complying with user specifications
 */
export const AiChatService = {
  // បង្កើត Chat ថ្មី
  async createNewChat(userId: string): Promise<string> {
    const chatsRef = collection(db, "users", userId, "ai_chats");
    const newChatRef = doc(chatsRef);

    const newChatData = {
      chatId: newChatRef.id,
      title: "New Chat",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: [],
    };

    await setDoc(newChatRef, newChatData);
    return newChatRef.id;
  },

  // យកបញ្ជី Chat ទាំងអស់
  async getChatHistory(userId: string): Promise<AIChatSession[]> {
    try {
      const chatsRef = collection(db, "users", userId, "ai_chats");
      const q = query(chatsRef, orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
    } catch (err) {
      console.warn("getChatHistory offline or network error fallback:", err);
      // Fallback to localStorage for offline resilience
      try {
        const local = localStorage.getItem(`hugi_offline_ai_chats_${userId}`);
        if (local) {
          return JSON.parse(local);
        }
      } catch (e) {}
      return [];
    }
  },

  // យក Chat ជាក់លាក់
  async getChat(userId: string, chatId: string): Promise<AIChatSession | null> {
    try {
      const chatRef = doc(db, "users", userId, "ai_chats", chatId);
      const docSnap = await getDoc(chatRef);
      if (!docSnap.exists()) return null;
      return {
        id: docSnap.id,
        ...(docSnap.data() as any),
      };
    } catch (err) {
      console.warn("getChat offline fallback:", err);
      try {
        const local = localStorage.getItem(`hugi_offline_ai_chats_${userId}`);
        if (local) {
          const parsed: AIChatSession[] = JSON.parse(local);
          const found = parsed.find(c => c.id === chatId);
          if (found) return found;
        }
      } catch (e) {}
      return null;
    }
  },

  // រក្សាទុកសារ (Save Message)
  async saveMessage(userId: string, chatId: string, role: "user" | "assistant", content: string): Promise<void> {
    const newMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    // Save locally immediately for offline resilience
    try {
      const localKey = `hugi_offline_ai_chats_${userId}`;
      const local = localStorage.getItem(localKey);
      let sessions: AIChatSession[] = local ? JSON.parse(local) : [];
      let target = sessions.find(s => s.id === chatId);
      if (target) {
        if (!target.messages) target.messages = [];
        target.messages.push(newMessage);
        if (role === "user" && target.title === "New Chat" && content.trim().length > 0) {
          target.title = content.trim().substring(0, 30) + (content.length > 30 ? "..." : "");
        }
        target.updatedAt = new Date().toISOString();
      } else {
        sessions.unshift({
          id: chatId,
          chatId,
          title: role === "user" ? content.trim().substring(0, 30) : "New Chat",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [newMessage],
        });
      }
      localStorage.setItem(localKey, JSON.stringify(sessions));
    } catch (e) {}

    // Try Firestore update
    try {
      const chatRef = doc(db, "users", userId, "ai_chats", chatId);
      let autoTitleUpdate = {};
      if (role === "user") {
        const snap = await getDoc(chatRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.title === "New Chat" && content.trim().length > 0) {
            const shortTitle = content.trim().substring(0, 30) + (content.length > 30 ? "..." : "");
            autoTitleUpdate = { title: shortTitle };
          }
        }
      }

      await updateDoc(chatRef, {
        ...autoTitleUpdate,
        messages: arrayUnion(newMessage),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore saveMessage offline mode used:", err);
    }
  },

  // លុប Chat
  async deleteChat(userId: string, chatId: string): Promise<void> {
    const chatRef = doc(db, "users", userId, "ai_chats", chatId);
    await deleteDoc(chatRef);
  },

  // លុប Chat ទាំងអស់
  async clearAllChats(userId: string): Promise<void> {
    const chatsRef = collection(db, "users", userId, "ai_chats");
    const snapshot = await getDocs(chatsRef);

    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  },
};
