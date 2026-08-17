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
      console.warn("getChatHistory error or missing index:", err);
      // Fallback without orderBy if index is still building
      try {
        const chatsRef = collection(db, "users", userId, "ai_chats");
        const snapshot = await getDocs(chatsRef);
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        return list.sort((a, b) => {
          const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : Date.now();
          const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : Date.now();
          return tB - tA;
        });
      } catch (innerErr) {
        console.error("Fallback getChatHistory error:", innerErr);
        return [];
      }
    }
  },

  // យក Chat ជាក់លាក់
  async getChat(userId: string, chatId: string): Promise<AIChatSession | null> {
    const chatRef = doc(db, "users", userId, "ai_chats", chatId);
    const docSnap = await getDoc(chatRef);
    if (!docSnap.exists()) return null;
    return {
      id: docSnap.id,
      ...(docSnap.data() as any),
    };
  },

  // រក្សាទុកសារ (Save Message)
  async saveMessage(userId: string, chatId: string, role: "user" | "assistant", content: string): Promise<void> {
    const chatRef = doc(db, "users", userId, "ai_chats", chatId);

    const newMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      role,
      content,
      timestamp: new Date().toISOString(), // store ISO string for serializability in arrayUnion
    };

    // Auto-generate title from first user message if title is "New Chat"
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
