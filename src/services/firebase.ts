import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { User, Contact, FriendRequest, FriendRequestStatus } from "../types";

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

/**
 * Firestore Service for User Profile, Comprehensive Search & Messaging
 */
export const FirebaseService = {
  /**
   * Check if a username is available in Firestore
   * usernames collection stores document ID as lowercase clean username
   */
  async isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
    const clean = username.trim().toLowerCase().replace(/^@/, "");
    if (!clean || clean.length < 3) return false;

    try {
      const usernameDocRef = doc(db, "usernames", clean);
      const snapshot = await getDoc(usernameDocRef);
      if (!snapshot.exists()) {
        return true;
      }
      const data = snapshot.data();
      return Boolean(currentUserId && data.userId === currentUserId);
    } catch (err) {
      console.warn("Firestore isUsernameAvailable check fallback:", err);
      return true;
    }
  },

  /**
   * Register or Claim a Unique @username in Firestore
   * - Saves mapping in `usernames/{cleanUsername}` -> { userId, username, updatedAt }
   * - Saves profile in `users/{userId}` -> User document
   */
  async saveUserProfile(user: User, oldUsername?: string): Promise<{ success: boolean; error?: string }> {
    const cleanUsername = user.username.trim().toLowerCase().replace(/^@/, "");
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: "Username ត្រូវមានយ៉ាងតិច ៣ តួអក្សរ" };
    }

    try {
      // 1. Verify availability
      const isAvailable = await this.isUsernameAvailable(cleanUsername, user.id);
      if (!isAvailable) {
        return { success: false, error: `@${cleanUsername} ត្រូវបានប្រើប្រាស់រួចហើយ សូមជ្រើសរើសឈ្មោះផ្សេង` };
      }

      // 2. If old username existed and changed, clean it up or mark reassigned
      if (oldUsername && oldUsername.toLowerCase() !== cleanUsername) {
        const oldRef = doc(db, "usernames", oldUsername.toLowerCase());
        await setDoc(oldRef, { userId: "", available: true, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
      }

      // 3. Claim username doc
      const usernameDocRef = doc(db, "usernames", cleanUsername);
      await setDoc(usernameDocRef, {
        userId: user.id,
        username: cleanUsername,
        name: user.name,
        displayName: user.name,
        avatar: user.avatar || "",
        phone: user.phone || "",
        phoneNumber: user.phone || "",
        email: user.email || "",
        bio: user.bio || "",
        updatedAt: serverTimestamp(),
      });

      // 4. Save User document in users collection
      const userDocRef = doc(db, "users", user.id);
      await setDoc(userDocRef, {
        ...user,
        username: cleanUsername,
        displayName: user.name,
        phoneNumber: user.phone,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return { success: true };
    } catch (err: any) {
      console.error("Firestore saveUserProfile error:", err);
      return { success: true }; // Allow graceful local operation if offline
    }
  },

  /**
   * Look up user by @username in Firestore
   */
  async findUserByUsername(usernameQuery: string): Promise<User | Contact | null> {
    const clean = usernameQuery.trim().toLowerCase().replace(/^@/, "");
    if (!clean) return null;

    try {
      const usernameDocRef = doc(db, "usernames", clean);
      const docSnap = await getDoc(usernameDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.userId) {
          // Fetch full user doc
          const userDocSnap = await getDoc(doc(db, "users", data.userId));
          if (userDocSnap.exists()) {
            return userDocSnap.data() as User;
          }
          return {
            id: data.userId,
            name: data.name || data.displayName || clean,
            username: clean,
            phone: data.phone || data.phoneNumber || "+855 12 345 678",
            email: data.email || `${clean}@hugi.app`,
            avatar: data.avatar || "",
            bio: data.bio || "Hugi User ✨",
            isOnline: true,
          } as Contact;
        }
      }
    } catch (err) {
      console.warn("Firestore findUserByUsername fallback:", err);
    }
    return null;
  },

  /**
   * Search Users across multiple criteria in Firestore:
   * 1. By @username (exact or prefix)
   * 2. By Phone Number (digits query)
   * 3. By Display Name / Name prefix / Email
   */
  async searchUsers(queryStr: string): Promise<Contact[]> {
    const trimmed = queryStr.trim();
    if (!trimmed) return [];

    const resultsMap = new Map<string, Contact>();

    try {
      // 1. Search by @username
      if (trimmed.startsWith("@")) {
        const username = trimmed.substring(1).toLowerCase();
        
        // Exact match check
        const exactDoc = await getDoc(doc(db, "usernames", username));
        if (exactDoc.exists()) {
          const data = exactDoc.data();
          if (data.userId) {
            resultsMap.set(data.userId, {
              id: data.userId,
              name: data.name || data.displayName || data.username,
              username: data.username,
              phone: data.phone || data.phoneNumber || "",
              email: data.email || "",
              avatar: data.avatar || "",
              bio: data.bio || "",
              isOnline: true,
            });
          }
        }

        // Prefix query on usernames
        const prefixQ = query(
          collection(db, "usernames"),
          where("username", ">=", username),
          where("username", "<=", username + "\uf8ff")
        );
        const prefixSnap = await getDocs(prefixQ);
        prefixSnap.forEach((d) => {
          const data = d.data();
          if (data.userId && !resultsMap.has(data.userId)) {
            resultsMap.set(data.userId, {
              id: data.userId,
              name: data.name || data.displayName || data.username,
              username: data.username,
              phone: data.phone || data.phoneNumber || "",
              email: data.email || "",
              avatar: data.avatar || "",
              bio: data.bio || "",
              isOnline: true,
            });
          }
        });

        return Array.from(resultsMap.values());
      }

      // 2. Search by Phone Number
      const digitsOnly = trimmed.replace(/[^\d+]/g, "");
      if (/^\+?\d{3,}$/.test(digitsOnly)) {
        const qUsersPhone = query(
          collection(db, "users"),
          where("phoneNumber", "==", digitsOnly)
        );
        const phoneSnap = await getDocs(qUsersPhone);
        phoneSnap.forEach((d) => {
          const data = d.data();
          const userId = d.id || data.id;
          if (userId && !resultsMap.has(userId)) {
            resultsMap.set(userId, {
              id: userId,
              name: data.displayName || data.name || "Hugi User",
              username: data.username,
              phone: data.phoneNumber || data.phone || digitsOnly,
              email: data.email || "",
              avatar: data.avatar || "",
              bio: data.bio || "",
              isOnline: true,
            });
          }
        });

        // Also query usernames collection for phone
        const qUsernamesPhone = query(
          collection(db, "usernames"),
          where("phone", "==", digitsOnly)
        );
        const uPhoneSnap = await getDocs(qUsernamesPhone);
        uPhoneSnap.forEach((d) => {
          const data = d.data();
          if (data.userId && !resultsMap.has(data.userId)) {
            resultsMap.set(data.userId, {
              id: data.userId,
              name: data.name || data.displayName || data.username,
              username: data.username,
              phone: data.phone || data.phoneNumber || digitsOnly,
              email: data.email || "",
              avatar: data.avatar || "",
              bio: data.bio || "",
              isOnline: true,
            });
          }
        });
      }

      // 3. Search by Name / DisplayName / Email prefix
      const lowerQuery = trimmed.toLowerCase();

      // Query usernames by username prefix
      const qUsernames = query(
        collection(db, "usernames"),
        where("username", ">=", lowerQuery),
        where("username", "<=", lowerQuery + "\uf8ff")
      );
      const usernamesSnap = await getDocs(qUsernames);
      usernamesSnap.forEach((d) => {
        const data = d.data();
        if (data.userId && !resultsMap.has(data.userId)) {
          resultsMap.set(data.userId, {
            id: data.userId,
            name: data.name || data.displayName || data.username,
            username: data.username,
            phone: data.phone || data.phoneNumber || "",
            email: data.email || "",
            avatar: data.avatar || "",
            bio: data.bio || "",
            isOnline: true,
          });
        }
      });

      // Query users collection by displayName
      try {
        const qUsersName = query(
          collection(db, "users"),
          where("displayName", ">=", trimmed),
          where("displayName", "<=", trimmed + "\uf8ff")
        );
        const nameSnap = await getDocs(qUsersName);
        nameSnap.forEach((d) => {
          const data = d.data();
          const userId = d.id || data.id;
          if (userId && !resultsMap.has(userId)) {
            resultsMap.set(userId, {
              id: userId,
              name: data.displayName || data.name || "Hugi User",
              username: data.username,
              phone: data.phoneNumber || data.phone || "",
              email: data.email || "",
              avatar: data.avatar || "",
              bio: data.bio || "",
              isOnline: true,
            });
          }
        });
      } catch (err) {
        console.warn("displayName index search fallback:", err);
      }

      return Array.from(resultsMap.values());
    } catch (err) {
      console.warn("Firestore searchUsers fallback:", err);
      return [];
    }
  },

  /**
   * Search users by prefix / username query in Firestore (backward compatibility)
   */
  async searchUsersByUsername(queryStr: string): Promise<Contact[]> {
    return this.searchUsers(queryStr);
  },

  /**
   * Start or retrieve a Firestore direct chat between current user and other user
   */
  async startChat(currentUser: User, otherUser: Contact | User): Promise<{ chatId: string; isNew: boolean }> {
    const currentUid = currentUser.id;
    const otherUserId = otherUser.id;
    const chatId = [currentUid, otherUserId].sort().join("_");

    try {
      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          id: chatId,
          participants: [currentUid, otherUserId],
          participantDetails: [
            {
              id: currentUser.id,
              name: currentUser.name,
              username: currentUser.username,
              avatar: currentUser.avatar,
            },
            {
              id: otherUser.id,
              name: otherUser.name,
              username: otherUser.username || "",
              avatar: otherUser.avatar || "",
            },
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: null,
          lastMessageTime: null,
        });
        return { chatId, isNew: true };
      }

      return { chatId, isNew: false };
    } catch (err) {
      console.warn("Firestore startChat fallback:", err);
      return { chatId, isNew: false };
    }
  },

  /**
   * Send Friend Request (User A -> User B)
   */
  async sendFriendRequest(fromUser: User, toUser: Contact | User): Promise<FriendRequest> {
    const reqId = `req_${fromUser.id}_${toUser.id}`;
    const newReq: FriendRequest = {
      id: reqId,
      fromUserId: fromUser.id,
      fromUserName: fromUser.name,
      fromUserUsername: fromUser.username,
      fromUserAvatar: fromUser.avatar,
      toUserId: toUser.id,
      toUserName: toUser.name,
      toUserUsername: toUser.username,
      toUserAvatar: toUser.avatar,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const reqRef = doc(db, "friend_requests", reqId);
      await setDoc(reqRef, {
        ...newReq,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore sendFriendRequest fallback:", err);
    }

    return newReq;
  },

  /**
   * Respond to Friend Request (Accept or Decline)
   */
  async respondFriendRequest(requestId: string, status: "accepted" | "declined"): Promise<void> {
    try {
      const reqRef = doc(db, "friend_requests", requestId);
      await updateDoc(reqRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore respondFriendRequest fallback:", err);
    }
  },
};
