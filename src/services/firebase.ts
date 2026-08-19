import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
  addDoc,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { User, Contact, FriendRequest, FriendRequestStatus, Story, Post, PostComment } from "../types";
import { getRealAvatar, sanitizeAvatarUrl } from "../utils/avatars";

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, firebaseConfig.firestoreDatabaseId || undefined);
export const storage = getStorage(app, firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined);

// Enable offline persistence gracefully if supported
try {
  // Firestore v9 handles persistence or caching automatically, but we can suppress unhandled offline warnings
} catch (e) {}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
      const profileData = {
        ...user,
        username: cleanUsername,
        displayName: user.name,
        phoneNumber: user.phone,
        country: "Cambodia",
        countryCode: "KH",
        isOnline: true,
        updatedAt: serverTimestamp(),
      };
      await setDoc(userDocRef, profileData, { merge: true });

      // 5. Save in profiles collection as well
      const profileDocRef = doc(db, "profiles", user.id);
      await setDoc(profileDocRef, profileData, { merge: true }).catch(() => {});

      return { success: true };
    } catch (err: any) {
      console.error("Firestore saveUserProfile error:", err);
      return { success: true }; // Allow graceful local operation if offline
    }
  },

  /**
   * Fetch registered users in Cambodia from Firestore `profiles` / `users` collections
   * for automatic suggested friends discovery (excluding current logged-in user).
   */
  async getSuggestedUsers(currentUserId: string, limitCount = 30): Promise<Contact[]> {
    const resultsMap = new Map<string, Contact>();

    // Initial Cambodian community seed suggestions with high-quality real portraits
    const cambodiaCommunitySeed: Contact[] = [
      {
        id: "seed_sokha_kh",
        name: "សុខា ភិរុណ",
        username: "sokha_kh",
        phone: "+855 12 889 900",
        email: "sokha.kh@hugi.app",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        bio: "📍 ភ្នំពេញ | Developer & Tech Enthusiast 🇰🇭",
        isOnline: true,
      },
      {
        id: "seed_chanthida_sr",
        name: "ចាន់ ធីតា",
        username: "thida_sr",
        phone: "+855 92 334 455",
        email: "thida.sr@hugi.app",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        bio: "📍 សៀមរាប | រីករាយនឹងការរាប់អានមិត្តថ្មីៗ ✨",
        isOnline: true,
      },
      {
        id: "seed_vanna_ritth",
        name: "វណ្ណា រិទ្ធ",
        username: "vanna_ritth",
        phone: "+855 88 776 655",
        email: "vanna.ritth@hugi.app",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
        bio: "📍 បាត់ដំបង | ស្រលាញ់តន្ត្រី និងការធ្វើដំណើរកម្សាន្ត 🎵",
        isOnline: true,
      },
      {
        id: "seed_sophea_kalyan",
        name: "សុភ័ក្រ កល្យាណ",
        username: "kalyan_pp",
        phone: "+855 70 123 999",
        email: "kalyan.pp@hugi.app",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
        bio: "📍 រាជធានីភ្នំពេញ | ស្វាគមន៍មកកាន់ Hugi Chat 🇰🇭",
        isOnline: true,
      },
      {
        id: "seed_makara_design",
        name: "រតនា វិចិត្រ",
        username: "vichet_art",
        phone: "+855 93 456 789",
        email: "vichet.art@hugi.app",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
        bio: "📍 កំពត | UI Designer & Coffee Lover ☕",
        isOnline: true,
      },
    ];

    try {
      // 1. Fetch from `profiles` collection
      const qProfiles = query(collection(db, "profiles"), limit(limitCount));
      const snapProfiles = await getDocs(qProfiles).catch(() => null);
      if (snapProfiles && !snapProfiles.empty) {
        snapProfiles.forEach((d) => {
          const data = d.data();
          const userId = d.id || data.id;
          if (userId && userId !== currentUserId) {
            resultsMap.set(userId, {
              id: userId,
              name: data.displayName || data.name || data.username || "Hugi User",
              username: data.username || "",
              phone: data.phoneNumber || data.phone || "+855 12 345 678",
              email: data.email || "",
              avatar: sanitizeAvatarUrl(data.avatar || data.photoURL, data.username || userId),
              bio: data.bio || "📍 កម្ពុជា | សមាជិក Hugi 🇰🇭",
              isOnline: data.isOnline !== false,
            });
          }
        });
      }

      // 2. Fetch from `users` collection if profiles has few
      if (resultsMap.size < 10) {
        const qUsers = query(collection(db, "users"), limit(limitCount));
        const snapUsers = await getDocs(qUsers).catch(() => null);
        if (snapUsers && !snapUsers.empty) {
          snapUsers.forEach((d) => {
            const data = d.data();
            const userId = d.id || data.id;
            if (userId && userId !== currentUserId && !resultsMap.has(userId)) {
              resultsMap.set(userId, {
                id: userId,
                name: data.displayName || data.name || data.username || "Hugi User",
                username: data.username || "",
                phone: data.phoneNumber || data.phone || "+855 12 345 678",
                email: data.email || "",
                avatar: sanitizeAvatarUrl(data.avatar || data.photoURL, data.username || userId),
                bio: data.bio || "📍 កម្ពុជា | សមាជិក Hugi 🇰🇭",
                isOnline: data.isOnline !== false,
              });
            }
          });
        }
      }

      // 3. Fetch from `usernames` collection for any other registered profiles
      if (resultsMap.size < 10) {
        const qUsernames = query(collection(db, "usernames"), limit(limitCount));
        const snapUsernames = await getDocs(qUsernames).catch(() => null);
        if (snapUsernames && !snapUsernames.empty) {
          snapUsernames.forEach((d) => {
            const data = d.data();
            const userId = data.userId;
            if (userId && userId !== currentUserId && !resultsMap.has(userId)) {
              resultsMap.set(userId, {
                id: userId,
                name: data.name || data.displayName || data.username || "Hugi User",
                username: data.username || "",
                phone: data.phone || data.phoneNumber || "+855 12 345 678",
                email: data.email || "",
                avatar: sanitizeAvatarUrl(data.avatar || data.photoURL, data.username || userId),
                bio: data.bio || "📍 កម្ពុជា | សមាជិក Hugi 🇰🇭",
                isOnline: true,
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn("Firestore getSuggestedUsers fallback:", err);
    }

    // Merge with Cambodian community seed suggestions so new users always have suggested contacts
    for (const seed of cambodiaCommunitySeed) {
      if (seed.id !== currentUserId && !resultsMap.has(seed.id)) {
        resultsMap.set(seed.id, seed);
      }
    }

    return Array.from(resultsMap.values());
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
  
  listenToUserChats(userId: string, callback: (chats: any[]) => void): () => void {
    try {
      const q = query(collection(db, "chats"), where("participants", "array-contains", userId));
      return onSnapshot(
        q,
        (snapshot) => {
          const chatsList: any[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data({ serverTimestamps: "estimate" });
            const otherParticipantDetail = data.participantDetails?.find((p: any) => p.id !== userId);
            
            chatsList.push({
              id: docSnap.id,
              participants: data.participantDetails || [],
              isGroup: false,
              name: otherParticipantDetail?.name || "Unknown",
              avatar: otherParticipantDetail?.avatar || "",
              lastMessage: data.lastMessage,
              unreadCount: 0,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            });
          });

          // Sort by updatedAt desc
          chatsList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          callback(chatsList);
        },
        (err) => {
          console.warn("listenToUserChats error:", err);
        }
      );
    } catch (err) {
      console.warn("listenToUserChats fallback:", err);
      return () => {};
    }
  },

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

  /**
   * Upload Media to Firebase Storage (or data URL fallback)
   */
  async uploadMedia(path: string, mediaData: string | File): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      
      const uploadTask = async () => {
        if (typeof mediaData === "string") {
          if (mediaData.startsWith("data:")) {
            await uploadString(storageRef, mediaData, "data_url");
            return await getDownloadURL(storageRef);
          }
          return mediaData;
        } else {
          await uploadBytes(storageRef, mediaData);
          return await getDownloadURL(storageRef);
        }
      };

      // 15 second timeout to prevent infinite hanging in restricted iframes
      const result = await Promise.race([
        uploadTask(),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error("Storage upload timeout")), 15000)
        )
      ]);
      
      return result;
    } catch (err) {
      console.warn("Firebase Storage upload error, falling back to direct media data:", err);
      if (typeof mediaData === "string") return mediaData;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(mediaData);
      });
    }
  },

  /**
   * Real-time Stories
   */
  async createStory(storyData: {
    currentUser: User;
    type: "image" | "text";
    text?: string;
    imageUrl?: string;
    bgColor?: string;
  }): Promise<Story> {
    const storyId = "story_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const newStory: Story = {
      id: storyId,
      userId: storyData.currentUser.id,
      userName: storyData.currentUser.name,
      userUsername: storyData.currentUser.username,
      userAvatar: storyData.currentUser.avatar || "",
      type: storyData.type,
      text: storyData.text || "",
      imageUrl: storyData.imageUrl || "",
      bgColor: storyData.bgColor || "",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      likes: [],
      viewedBy: [storyData.currentUser.id],
    };

    try {
      const storyRef = doc(db, "stories", storyId);
      await setDoc(storyRef, {
        ...newStory,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    } catch (err) {
      console.warn("Firestore createStory error fallback:", err);
    }

    return newStory;
  },

  async deleteStory(storyId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "stories", storyId));
    } catch (err) {
      console.warn("Firestore deleteStory error:", err);
    }
  },

  async likeStory(storyId: string, userId: string): Promise<void> {
    try {
      const storyRef = doc(db, "stories", storyId);
      const snap = await getDoc(storyRef);
      if (snap.exists()) {
        const data = snap.data();
        const likes: string[] = data.likes || [];
        if (likes.includes(userId)) {
          await updateDoc(storyRef, { likes: arrayRemove(userId) });
        } else {
          await updateDoc(storyRef, { likes: arrayUnion(userId) });
        }
      }
    } catch (err) {
      console.warn("Firestore likeStory error:", err);
    }
  },

  /**
   * Listen to active Stories in real-time (last 24 hours only)
   */
  listenToStories(callback: (stories: Story[]) => void): () => void {
    try {
      const storiesQuery = query(collection(db, "stories"));
      return onSnapshot(
        storiesQuery,
        (snapshot) => {
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          const storiesList: Story[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let storyTime = now;
            if (data.createdAt?.toDate) {
              storyTime = data.createdAt.toDate().getTime();
            } else if (data.createdAt?.seconds) {
              storyTime = data.createdAt.seconds * 1000;
            } else if (data.createdAt) {
              storyTime = new Date(data.createdAt).getTime();
            }

            // Expiration filter: only within 24 hours
            if (storyTime >= oneDayAgo) {
              storiesList.push({
                id: docSnap.id,
                userId: data.userId || "",
                userName: data.userName || "អ្នកប្រើប្រាស់",
                userUsername: data.userUsername || "",
                userAvatar: data.userAvatar || "",
                type: data.type || "text",
                text: data.text || "",
                imageUrl: data.imageUrl || "",
                bgColor: data.bgColor || "",
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date(storyTime).toISOString(),
                expiresAt: data.expiresAt || new Date(storyTime + 24 * 60 * 60 * 1000).toISOString(),
                likes: data.likes || [],
                viewedBy: data.viewedBy || [],
              });
            }
          });

          // Sort newest first
          storiesList.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeB - timeA;
          });

          callback(storiesList);
        },
        (error) => {
          console.warn("Stories onSnapshot listener warning:", error);
        }
      );
    } catch (err) {
      console.warn("listenToStories init fallback:", err);
      return () => {};
    }
  },

  /**
   * Real-time Posts
   */
  async createPost(postData: {
    currentUser: User;
    text: string;
    imageUrl?: string;
  }): Promise<Post> {
    const postId = "post_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const newPost: Post = {
      id: postId,
      userId: postData.currentUser.id,
      userName: postData.currentUser.name,
      userUsername: postData.currentUser.username,
      userAvatar: postData.currentUser.avatar || "",
      text: postData.text.trim(),
      imageUrl: postData.imageUrl || "",
      likes: [],
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const postRef = doc(db, "posts", postId);
      await setDoc(postRef, {
        ...newPost,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newPost;
    } catch (err) {
      console.error("Firestore createPost error:", err);
      throw err; // Throw error to be caught by UI
    }
  },

  async deletePost(postId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "posts", postId));
    } catch (err) {
      console.warn("Firestore deletePost error:", err);
    }
  },

  async likePost(postId: string, userId: string): Promise<void> {
    try {
      const postRef = doc(db, "posts", postId);
      const snap = await getDoc(postRef);
      if (snap.exists()) {
        const data = snap.data();
        const likes: string[] = data.likes || [];
        if (likes.includes(userId)) {
          await updateDoc(postRef, {
            likes: arrayRemove(userId),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(postRef, {
            likes: arrayUnion(userId),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.warn("Firestore likePost error:", err);
    }
  },

  async addCommentToPost(
    postId: string,
    commentData: { currentUser: User; text: string }
  ): Promise<PostComment> {
    const commentId = "cmt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const newComment: PostComment = {
      id: commentId,
      userId: commentData.currentUser.id,
      userName: commentData.currentUser.name,
      userUsername: commentData.currentUser.username,
      userAvatar: commentData.currentUser.avatar || "",
      text: commentData.text.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        comments: arrayUnion({
          ...newComment,
          createdAt: new Date().toISOString(),
        }),
        commentsCount: (await getDoc(postRef)).data()?.commentsCount ? (await getDoc(postRef)).data()?.commentsCount + 1 : 1,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore addCommentToPost fallback:", err);
    }

    return newComment;
  },

  /**
   * Listen to Posts in real-time
   */
  listenToPosts(callback: (posts: Post[]) => void): () => void {
    try {
      const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      return onSnapshot(
        postsQuery,
        (snapshot) => {
          const postsList: Post[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data({ serverTimestamps: "estimate" });
            postsList.push({
              id: docSnap.id,
              userId: data.userId || "",
              userName: data.userName || "អ្នកប្រើប្រាស់",
              userUsername: data.userUsername || "",
              userAvatar: data.userAvatar || "",
              text: data.text || "",
              imageUrl: data.imageUrl || "",
              likes: data.likes || [],
              commentsCount: data.comments?.length || data.commentsCount || 0,
              comments: data.comments || [],
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
            });
          });

          // Sort newest posts first
          postsList.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeB - timeA;
          });

          callback(postsList);
        },
        (error) => {
          console.warn("Posts onSnapshot listener warning:", error);
        }
      );
    } catch (err) {
      console.warn("listenToPosts init fallback:", err);
      return () => {};
    }
  },
};
