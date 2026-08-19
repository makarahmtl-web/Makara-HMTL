with open("src/App.tsx", "r") as f:
    content = f.read()

replacement = """    // 2. Load cached states
    const loadedChats = StorageService.getChats();
    setChats(loadedChats);

    // Real-time chat list listener
    let unsubChats = () => {};
    const localUser = StorageService.getUser();
    if (localUser && localUser.id) {
      unsubChats = FirebaseService.listenToUserChats(localUser.id, (chatsList) => {
        setChats(chatsList);
        StorageService.saveChats(chatsList);
      });
    }

    const loadedStories = StorageService.getStories();"""

content = content.replace("""    // 2. Load cached states
    const loadedChats = StorageService.getChats();
    setChats(loadedChats);

    const loadedStories = StorageService.getStories();""", replacement)

content = content.replace("unsubStories();", "unsubStories();\n      unsubChats();")

with open("src/App.tsx", "w") as f:
    f.write(content)
