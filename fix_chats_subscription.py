import re

with open("src/services/firebase.ts", "r") as f:
    content = f.read()

listen_chats_func = """
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
"""

content = content.replace("async startChat", listen_chats_func + "\n  async startChat")

with open("src/services/firebase.ts", "w") as f:
    f.write(content)
