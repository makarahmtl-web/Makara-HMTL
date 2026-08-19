with open("src/views/ChatDetailView.tsx", "r") as f:
    content = f.read()

if "playChimeNotification" not in content:
    content = content.replace(
        'import { sanitizeAvatarUrl } from "../utils/avatars";',
        'import { sanitizeAvatarUrl } from "../utils/avatars";\nimport { playChimeNotification, RingbackPlayer, RingtonePlayer } from "../utils/audio";'
    )
    
    # Let's add a ref for previous messages length
    content = content.replace(
        '  const [isSidebarOpen, setIsSidebarOpen] = useState(false);',
        '  const [isSidebarOpen, setIsSidebarOpen] = useState(false);\n  const prevMessagesLengthRef = useRef(0);'
    )
    
    replacement = """        if (fbMsgs.length > 0) {
          // Play chime if new incoming message
          if (prevMessagesLengthRef.current > 0 && fbMsgs.length > prevMessagesLengthRef.current) {
            const lastMsg = fbMsgs[fbMsgs.length - 1];
            if (lastMsg.senderId !== currentUser.id) {
              playChimeNotification();
            }
          }
          prevMessagesLengthRef.current = fbMsgs.length;

          setMessages(fbMsgs);"""
          
    content = content.replace("        if (fbMsgs.length > 0) {\n          setMessages(fbMsgs);", replacement)

    with open("src/views/ChatDetailView.tsx", "w") as f:
        f.write(content)
