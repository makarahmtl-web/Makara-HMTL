import re

with open("src/views/ChatDetailView.tsx", "r") as f:
    content = f.read()

if "callEndMessage" not in content:
    content = content.replace(
        '  const [callModal, setCallModal] = useState<"audio" | "video" | null>(null);',
        '  const [callModal, setCallModal] = useState<"audio" | "video" | null>(null);\n  const [callEndMessage, setCallEndMessage] = useState<string | null>(null);'
    )

    cleanup_call_new = """  const cleanupCall = (reason?: string) => {
    if (ringbackPlayerRef.current) {
      ringbackPlayerRef.current.stop();
      ringbackPlayerRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallModal(null);
    if (reason) {
      setCallEndMessage(reason);
      setTimeout(() => setCallEndMessage(null), 3500);
    }
  };"""

    content = content.replace("""  const cleanupCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallModal(null);
  };""", cleanup_call_new)
  
    # Now we need to pass a reason when it's declined or ended.
    content = content.replace('cleanupCall();', 'cleanupCall(); // generic')
    
    # Let's fix the snapshot listener for call
    call_listener = """    const callRef = doc(db, "calls", chat.id);
    const unsubCall = onSnapshot(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === "ended") {
          cleanupCall("ការហៅទូរស័ព្ទត្រូវបានបញ្ចប់ (Call ended)");
        } else if (data.status === "declined") {
          cleanupCall("ខ្សែរវល់ ឬបដិសេធ (User is busy or declined)");
        } else if (data.status === "connected" && callStatus !== "connected") {
          setCallStatus("connected");
        }
      } else {
        if (callModal) {
          cleanupCall("បាត់បង់ការភ្ជាប់ (Connection lost)");
        }
      }
    });"""
    
    content = content.replace("""    const callRef = doc(db, "calls", chat.id);
    const unsubCall = onSnapshot(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === "ended" || data.status === "declined") {
          cleanupCall(); // generic
        } else if (data.status === "connected" && callStatus !== "connected") {
          setCallStatus("connected");
        }
      } else {
        if (callModal) {
          cleanupCall(); // generic
        }
      }
    });""", call_listener)

    # Render callEndMessage in the UI
    toast_ui = """      {/* High-Fidelity peer-to-peer WebRTC Voice & Video Calling Screen */}
      
      {/* Call End Message Toast */}
      {callEndMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-bold shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center space-x-2">
            <PhoneOff className="w-5 h-5 text-red-400" />
            <span>{callEndMessage}</span>
          </div>
        </div>
      )}
"""
    content = content.replace('      {/* High-Fidelity peer-to-peer WebRTC Voice & Video Calling Screen */}', toast_ui)

    with open("src/views/ChatDetailView.tsx", "w") as f:
        f.write(content)
