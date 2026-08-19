import re

with open("src/views/ChatDetailView.tsx", "r") as f:
    content = f.read()

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
    setCallStatus("ended");
    if (reason) {
      setCallEndMessage(reason);
      setTimeout(() => setCallEndMessage(null), 3500);
    }
  };"""

content = re.sub(
    r"  const cleanupCall = \(\) => \{[\s\S]*?setCallStatus\(\"ended\"\);\n  \};",
    cleanup_call_new,
    content
)

# And fix handleEndCall just in case
handle_end = """  const handleEndCall = async () => {
    try {
      const callRef = doc(db, "calls", chat.id);
      await updateDoc(callRef, { status: "ended" });
    } catch (err) {}
    cleanupCall("ការហៅទូរស័ព្ទត្រូវបានបញ្ចប់ (Call ended)");
  };"""

content = re.sub(
    r"  const handleEndCall = async \(\) => \{[\s\S]*?cleanupCall\(\);\n  \};",
    handle_end,
    content
)

with open("src/views/ChatDetailView.tsx", "w") as f:
    f.write(content)
