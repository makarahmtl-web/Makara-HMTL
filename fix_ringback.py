import re

with open("src/views/ChatDetailView.tsx", "r") as f:
    content = f.read()

if "ringbackPlayerRef" not in content:
    content = content.replace(
        'const messagesEndRef = useRef<HTMLDivElement>(null);',
        'const messagesEndRef = useRef<HTMLDivElement>(null);\n  const ringbackPlayerRef = useRef<RingbackPlayer | null>(null);'
    )
    
    ringback_effect = """
  // Manage call ringback tone
  useEffect(() => {
    if (callModal && callStatus === "ringing") {
      if (!ringbackPlayerRef.current) {
        ringbackPlayerRef.current = new RingbackPlayer();
      }
      ringbackPlayerRef.current.start();
    } else {
      if (ringbackPlayerRef.current) {
        ringbackPlayerRef.current.stop();
        ringbackPlayerRef.current = null;
      }
    }
    
    return () => {
      if (ringbackPlayerRef.current) {
        ringbackPlayerRef.current.stop();
      }
    };
  }, [callModal, callStatus]);

  // Clean up call overlay with clear status
"""
    content = content.replace("  const scrollToBottom = () => {", ringback_effect + "\n  const scrollToBottom = () => {")

    with open("src/views/ChatDetailView.tsx", "w") as f:
        f.write(content)
