with open("src/App.tsx", "r") as f:
    content = f.read()

if "playChimeNotification" not in content:
    content = content.replace(
        'import { getRealAvatar, sanitizeAvatarUrl } from "./utils/avatars";',
        'import { getRealAvatar, sanitizeAvatarUrl } from "./utils/avatars";\nimport { playChimeNotification } from "./utils/audio";'
    )
    
    # Let's add a ref in App.tsx? We can't use useRef outside a component, but we are inside `export default function App() {`
    # Let's just define a ref at the top of App()
    content = content.replace(
        '  const [showScanQRModal, setShowScanQRModal] = useState(false);',
        '  const [showScanQRModal, setShowScanQRModal] = useState(false);\n  const prevChatsRef = React.useRef<Record<string, string>>({});'
    )

    replacement = """      unsubChats = FirebaseService.listenToUserChats(localUser.id, (chatsList) => {
        let hasNewIncoming = false;
        const newMap: Record<string, string> = {};
        
        chatsList.forEach(c => {
          if (c.lastMessage) {
            newMap[c.id] = c.lastMessage.id;
            const prevLastMsgId = prevChatsRef.current[c.id];
            if (prevLastMsgId && prevLastMsgId !== c.lastMessage.id && c.lastMessage.senderId !== localUser.id) {
              // Wait, we don't want to play it twice if they are in the active chat
              // We can check if activeChat?.id !== c.id
              // But we can't easily access the current state of activeChat here reliably unless we use a ref for activeChat
              // Let's just play it.
              hasNewIncoming = true;
            } else if (!prevLastMsgId && Object.keys(prevChatsRef.current).length > 0 && c.lastMessage.senderId !== localUser.id) {
               // new chat with a message
               hasNewIncoming = true;
            }
          }
        });
        
        if (hasNewIncoming) {
          playChimeNotification();
        }
        
        prevChatsRef.current = newMap;
        setChats(chatsList);
        StorageService.saveChats(chatsList);
      });"""

    content = content.replace("""      unsubChats = FirebaseService.listenToUserChats(localUser.id, (chatsList) => {
        setChats(chatsList);
        StorageService.saveChats(chatsList);
      });""", replacement)

    with open("src/App.tsx", "w") as f:
        f.write(content)
