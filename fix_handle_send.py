with open("src/views/ChatDetailView.tsx", "r") as f:
    content = f.read()

replacement = """    // Push to Firestore
    try {
      await setDoc(doc(db, "messages", messageId), {
        ...newMessage,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "chats", chat.id), {
        lastMessage: newMessage,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {"""

content = content.replace("""    // Push to Firestore
    try {
      await setDoc(doc(db, "messages", messageId), {
        ...newMessage,
        createdAt: serverTimestamp(),
      });
    } catch (err) {""", replacement)

with open("src/views/ChatDetailView.tsx", "w") as f:
    f.write(content)
