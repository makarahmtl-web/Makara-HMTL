import React, { useState, useEffect } from "react";
import { User, Chat, Story, Contact, FriendRequest } from "./types";
import { StorageService, DEFAULT_USER } from "./services/storage";
import { FirebaseService, auth, db } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { TopHeader } from "./components/TopHeader";
import { BottomNav, NavTab } from "./components/BottomNav";
import { LoginView } from "./views/LoginView";
import { ChatListView } from "./views/ChatListView";
import { ChatDetailView } from "./views/ChatDetailView";
import { StoryView } from "./views/StoryView";
import { AIView } from "./views/AIView";
import { ContactsView } from "./views/ContactsView";
import { ProfileView } from "./views/ProfileView";
import { MyQRCodeModal } from "./components/MyQRCodeModal";
import { ScanQRCodeModal } from "./components/ScanQRCodeModal";
import { FloatingAIChat } from "./components/FloatingAIChat";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>("chat");
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // QR Modal States & Floating AI Chat State
  const [showMyQRModal, setShowMyQRModal] = useState(false);
  const [showScanQRModal, setShowScanQRModal] = useState(false);
  const [showFloatingAIChat, setShowFloatingAIChat] = useState(false);

  // Load Initial Data and Auth listeners
  useEffect(() => {
    // 1. Listen to Firebase auth state changes for dynamic profile sync
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        // Authenticated. Check or auto-create profile document in Firestore
        let localUser = StorageService.getUser();
        
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            localUser = {
              id: firebaseUser.uid,
              name: data.displayName || data.name || firebaseUser.displayName || "អ្នកប្រើប្រាស់ Hugi",
              username: data.username || "user_" + firebaseUser.uid.slice(0, 5),
              email: data.email || firebaseUser.email || "",
              phone: data.phoneNumber || data.phone || firebaseUser.phoneNumber || "",
              avatar: data.avatar || firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              bio: data.bio || "សួស្តី! ខ្ញុំប្រើប្រាស់ Hugi Chat ✨",
              isOnline: true,
              showOnlineStatus: data.showOnlineStatus !== false,
              showPhone: data.showPhone !== false,
              soundEnabled: data.soundEnabled !== false,
              findableByUsername: data.findableByUsername || "everyone",
              showPublicQR: data.showPublicQR !== false,
              createdAt: data.createdAt || new Date().toISOString(),
            };
          } else {
            // Document doesn't exist, auto create it
            const generatedUsername = "user_" + Math.floor(10000 + Math.random() * 90000);
            localUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "អ្នកប្រើប្រាស់ Hugi",
              username: generatedUsername,
              email: firebaseUser.email || "",
              phone: firebaseUser.phoneNumber || "",
              avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              bio: "សួស្តី! ខ្ញុំប្រើប្រាស់ Hugi Chat ✨",
              isOnline: true,
              showOnlineStatus: true,
              showPhone: true,
              soundEnabled: true,
              findableByUsername: "everyone",
              showPublicQR: true,
              createdAt: new Date().toISOString(),
            };
            
            // Set document in Firestore
            await setDoc(userDocRef, {
              id: firebaseUser.uid,
              name: localUser.name,
              displayName: localUser.name,
              username: localUser.username,
              email: localUser.email,
              phone: localUser.phone,
              phoneNumber: localUser.phone,
              avatar: localUser.avatar,
              bio: localUser.bio,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            // Set username mapping
            const usernameRef = doc(db, "usernames", localUser.username);
            await setDoc(usernameRef, {
              userId: firebaseUser.uid,
              username: localUser.username,
              name: localUser.name,
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
        } catch (err) {
          console.warn("Firestore user sync error, using local fallback:", err);
          if (!localUser) {
            localUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "អ្នកប្រើប្រាស់ Hugi",
              username: "user_" + firebaseUser.uid.slice(0, 5),
              email: firebaseUser.email || "",
              phone: firebaseUser.phoneNumber || "",
              avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              bio: "សួស្តី! ខ្ញុំប្រើប្រាស់ Hugi Chat ✨",
              isOnline: true,
              showOnlineStatus: true,
              showPhone: true,
              soundEnabled: true,
              findableByUsername: "everyone",
              showPublicQR: true,
              createdAt: new Date().toISOString(),
            };
          }
        }

        StorageService.saveUser(localUser);
        setCurrentUser(localUser);
      } else {
        // Logged out
        setCurrentUser(null);
      }
    });

    // 2. Load cached states
    const loadedChats = StorageService.getChats();
    setChats(loadedChats);

    const loadedStories = StorageService.getStories();
    setStories(loadedStories);

    // 3. Real-time stories listener from Firestore
    const unsubStories = FirebaseService.listenToStories((storiesList) => {
      setStories(storiesList);
      StorageService.saveStories(storiesList);
    });

    const loadedContacts = StorageService.getContacts();
    setContacts(loadedContacts);

    const loadedRequests = StorageService.getFriendRequests();
    setFriendRequests(loadedRequests);

    return () => {
      unsubscribe();
      unsubStories();
    };
  }, []);

  // Login handler
  const handleLoginSuccess = (user: User) => {
    StorageService.saveUser(user);
    setCurrentUser(user);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const { signOut: firebaseSignOut } = await import("firebase/auth");
      const { auth } = await import("./services/firebase");
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn("Firebase signout warning:", err);
    }
    StorageService.saveUser(null);
    setCurrentUser(null);
    setActiveChat(null);
    setCurrentTab("chat");
  };

  // Delete account
  const handleDeleteAccount = async () => {
    try {
      const { signOut: firebaseSignOut } = await import("firebase/auth");
      const { auth } = await import("./services/firebase");
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn("Firebase signout during delete account warning:", err);
    }
    StorageService.clearAll();
    setCurrentUser(null);
    setActiveChat(null);
    setCurrentTab("chat");
    setChats([]);
    setStories([]);
    setContacts([]);
  };

  // Update profile
  const handleUpdateProfile = (updated: User) => {
    StorageService.saveUser(updated);
    setCurrentUser(updated);

    // Also update any chat participant info with current user's updated name & username
    const updatedChats = chats.map((c) => ({
      ...c,
      participants: c.participants.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              name: updated.name,
              username: updated.username,
              avatar: updated.avatar,
              phone: updated.phone,
            }
          : p
      ),
    }));
    setChats(updatedChats);
    StorageService.saveChats(updatedChats);
  };

  // Start chat with contact (Deterministic Chat ID + Firestore sync)
  const handleStartChatWithContact = async (contact: Contact) => {
    if (!currentUser) return;

    const deterministicChatId = [currentUser.id, contact.id].sort().join("_");

    let existingChat = chats.find(
      (c) =>
        c.id === deterministicChatId ||
        c.participants.some((p) => p.id === contact.id) ||
        (contact.username &&
          c.participants.some(
            (p) => p.username?.toLowerCase() === contact.username.toLowerCase()
          ))
    );

    if (!existingChat) {
      existingChat = {
        id: deterministicChatId,
        name: contact.name,
        isGroup: false,
        participants: [
          currentUser,
          {
            id: contact.id,
            name: contact.name,
            username: contact.username || contact.id.replace(/^c_/, ""),
            email: contact.email || "",
            phone: contact.phone,
            avatar: contact.avatar,
            bio: contact.bio || "",
            isOnline: contact.isOnline,
            showOnlineStatus: true,
            showPhone: true,
            soundEnabled: true,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedChats = [existingChat, ...chats];
      setChats(updatedChats);
      StorageService.saveChats(updatedChats);
    }

    // Sync to Firestore in background
    FirebaseService.startChat(currentUser, contact).catch(() => {});

    setActiveChat(existingChat);
  };

  // Add new Contact with username support
  const handleAddNewContact = (
    name: string,
    phone: string,
    email?: string,
    username?: string,
    avatar?: string
  ) => {
    const cleanUsername =
      username?.trim().toLowerCase().replace(/^@/, "") ||
      name.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "user" + Math.floor(Math.random() * 1000);

    // Check if already in contacts
    const existing = contacts.find(
      (c) =>
        c.username?.toLowerCase() === cleanUsername ||
        c.phone.replace(/\s+/g, "") === phone.replace(/\s+/g, "")
    );

    if (existing) {
      handleStartChatWithContact(existing);
      return;
    }

    const newContact: Contact = {
      id: "contact_" + Date.now(),
      name,
      username: cleanUsername,
      phone,
      email: email || `${cleanUsername}@gmail.com`,
      avatar:
        avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`,
      isOnline: true,
      bio: "សួស្តី! ខ្ញុំប្រើប្រាស់ Hugi Chat ✨",
    };

    const updated = [newContact, ...contacts];
    setContacts(updated);
    StorageService.saveContacts(updated);
    handleStartChatWithContact(newContact);
  };

  // Add Story
  const handleAddStory = (story: Story) => {
    const updated = [story, ...stories];
    setStories(updated);
    StorageService.saveStories(updated);
  };

  // Story reply to DM
  const handleSendStoryReply = (targetUserId: string, message: string) => {
    const targetContact = contacts.find((c) => c.id === targetUserId);
    if (targetContact) {
      handleStartChatWithContact(targetContact);
    }
  };

  // Delete chat
  const handleDeleteChat = (chatId: string) => {
    const updated = chats.filter((c) => c.id !== chatId);
    setChats(updated);
    StorageService.saveChats(updated);
    if (activeChat?.id === chatId) {
      setActiveChat(null);
    }
  };

  // If not logged in, show LoginView
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Calculate unread badge count
  const totalUnreadCount = chats.reduce(
    (acc, chat) => acc + (chat.unreadCount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#2D3436] font-sans flex flex-col antialiased selection:bg-[#6C63FF]/20 selection:text-[#6C63FF]">
      {/* Top Header */}
      <TopHeader
        user={currentUser}
        onProfileClick={() => {
          setActiveChat(null);
          setCurrentTab("profile");
        }}
        onOpenScanQR={() => setShowScanQRModal(true)}
        onOpenMyQR={() => setShowMyQRModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto relative overflow-x-hidden">
        {activeChat ? (
          <ChatDetailView
            chat={activeChat}
            currentUser={currentUser}
            onBack={() => setActiveChat(null)}
          />
        ) : (
          <>
            {currentTab === "chat" && (
              <ChatListView
                currentUser={currentUser}
                chats={chats}
                contacts={contacts}
                onSelectChat={(chat) => setActiveChat(chat)}
                onStartNewChatWithContact={handleStartChatWithContact}
                onAddNewContact={handleAddNewContact}
                onDeleteChat={handleDeleteChat}
              />
            )}

            {currentTab === "story" && (
              <StoryView
                currentUser={currentUser}
                stories={stories}
                onAddStory={handleAddStory}
                onSendStoryReply={handleSendStoryReply}
              />
            )}

            {currentTab === "ai" && <AIView currentUser={currentUser} />}

            {currentTab === "contacts" && (
              <ContactsView
                currentUser={currentUser}
                contacts={contacts}
                friendRequests={friendRequests}
                onStartChat={handleStartChatWithContact}
                onAddContact={handleAddNewContact}
                onSendFriendRequest={(target) => {}}
                onAcceptFriendRequest={(req) => {}}
                onDeclineFriendRequest={(req) => {}}
                onOpenScanQR={() => setShowScanQRModal(true)}
                onOpenMyQR={() => setShowMyQRModal(true)}
              />
            )}

            {currentTab === "profile" && (
              <ProfileView
                user={currentUser}
                onUpdateProfile={handleUpdateProfile}
                onLogout={handleLogout}
                onDeleteAccount={handleDeleteAccount}
                onOpenMyQR={() => setShowMyQRModal(true)}
                onOpenScanQR={() => setShowScanQRModal(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation (Hidden when in full active chat) */}
      {!activeChat && (
        <BottomNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            if (tab === "ai") {
              setShowFloatingAIChat(true);
            } else {
              setActiveChat(null);
              setCurrentTab(tab);
            }
          }}
          unreadCount={totalUnreadCount}
          hasNewStories={stories.length > 0}
        />
      )}

      {/* Floating AI Chat Modal */}
      <FloatingAIChat
        currentUser={currentUser}
        isOpen={showFloatingAIChat}
        onClose={() => setShowFloatingAIChat(false)}
      />

      {/* My QR Code Modal */}
      {showMyQRModal && (
        <MyQRCodeModal
          user={currentUser}
          onClose={() => setShowMyQRModal(false)}
        />
      )}

      {/* Scan QR Code Modal */}
      {showScanQRModal && (
        <ScanQRCodeModal
          currentUser={currentUser}
          contacts={contacts}
          onClose={() => setShowScanQRModal(false)}
          onAddContact={handleAddNewContact}
          onStartChat={(contact) => {
            handleStartChatWithContact(contact);
            setShowScanQRModal(false);
          }}
        />
      )}
    </div>
  );
}
