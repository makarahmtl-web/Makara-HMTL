import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  X,
  Camera,
  Image as ImageIcon,
  Flashlight,
  FlashlightOff,
  UserPlus,
  MessageSquare,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Contact, User } from "../types";
import { StorageService, INITIAL_CONTACTS } from "../services/storage";
import { FirebaseService } from "../services/firebase";

interface ScanQRCodeModalProps {
  currentUser: User;
  contacts: Contact[];
  onClose: () => void;
  onAddContact: (name: string, phone: string, email?: string, username?: string, avatar?: string) => void;
  onStartChat: (contact: Contact) => void;
}

export const ScanQRCodeModal: React.FC<ScanQRCodeModalProps> = ({
  currentUser,
  contacts,
  onClose,
  onAddContact,
  onStartChat,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  // Scanned user state
  const [scannedResult, setScannedResult] = useState<{
    id?: string;
    username: string;
    name: string;
    phone?: string;
    email?: string;
    avatar?: string;
    bio?: string;
    isFriend: boolean;
    isSelf: boolean;
  } | null>(null);

  const [manualInput, setManualInput] = useState("");
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Start camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        setCameraError(null);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          requestScanFrame();
        }
      } catch (err: any) {
        console.warn("Camera access failed or permission denied:", err);
        setCameraError("មិនអាចបើកកាមេរ៉ាបានទេ។ សូមអនុញ្ញាត Camera Permission ឬជ្រើសរើសរូបភាពពី Gallery។");
      }
    };

    const scanQRCode = () => {
      if (!isScanning || scannedResult) return;
      if (!videoRef.current || !canvasRef.current) {
        animationFrameId = requestAnimationFrame(scanQRCode);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          handleQRData(code.data);
          return;
        }
      }

      animationFrameId = requestAnimationFrame(scanQRCode);
    };

    const requestScanFrame = () => {
      animationFrameId = requestAnimationFrame(scanQRCode);
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isScanning, scannedResult]);

  // Flashlight toggle
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        try {
          await (track as any).applyConstraints({
            advanced: [{ torch: !torchOn }],
          });
          setTorchOn(!torchOn);
        } catch (e) {
          console.warn("Torch toggle failed:", e);
        }
      } else {
        setTorchOn(!torchOn);
      }
    }
  };

  // Decode from file/gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          handleQRData(code.data);
        } else {
          alert("មិនឃើញមាន QR Code នៅក្នុងរូបភាពនេះទេ។ សូមព្យាយាមជាមួយរូបភាពច្បាស់ជាងនេះ។");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Parse QR Code data
  const handleQRData = async (dataStr: string) => {
    setIsScanning(false);
    let username = "";
    let name = "";
    let phone = "";
    let email = "";
    let avatar = "";
    let bio = "";
    let id = "";

    try {
      if (dataStr.startsWith("{") && dataStr.endsWith("}")) {
        const parsed = JSON.parse(dataStr);
        if (parsed.username) username = parsed.username;
        if (parsed.name) name = parsed.name;
        if (parsed.phone) phone = parsed.phone;
        if (parsed.avatar) avatar = parsed.avatar;
        if (parsed.id) id = parsed.id;
      } else if (dataStr.includes("hugi.app/@")) {
        const parts = dataStr.split("hugi.app/@");
        username = parts[1]?.trim() || "";
      } else if (dataStr.startsWith("@")) {
        username = dataStr.replace(/^@/, "").trim();
      } else {
        username = dataStr.trim();
      }
    } catch {
      username = dataStr.trim();
    }

    username = username.toLowerCase().replace(/^@/, "");

    // 1. Try Firestore Lookup for real-time users
    try {
      const firestoreUser = await FirebaseService.findUserByUsername(username);
      if (firestoreUser) {
        name = firestoreUser.name;
        phone = firestoreUser.phone || phone;
        email = firestoreUser.email || email;
        avatar = firestoreUser.avatar || avatar;
        bio = firestoreUser.bio || bio;
        id = firestoreUser.id;
      }
    } catch (e) {
      console.warn("Firestore lookup failed:", e);
    }

    // 2. Look up in local database or initial contacts if not found
    if (!id) {
      const found = StorageService.findUserByUsername(username);
      if (found) {
        name = found.name;
        phone = found.phone || phone;
        email = found.email || email;
        avatar = found.avatar || avatar;
        bio = found.bio || bio;
        id = found.id;
      } else if (!name) {
        name = username.charAt(0).toUpperCase() + username.slice(1);
      }
    }

    const isSelf =
      currentUser.username?.toLowerCase() === username ||
      currentUser.id === id;

    const isFriend = contacts.some(
      (c) =>
        c.username?.toLowerCase() === username ||
        (id && c.id === id) ||
        (phone && c.phone === phone)
    );

    setScannedResult({
      id,
      username: username || "user",
      name: name || "Hugi User",
      phone,
      email,
      avatar,
      bio,
      isFriend,
      isSelf,
    });
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleQRData(manualInput.trim());
  };

  const handleAddFriend = () => {
    if (!scannedResult) return;
    onAddContact(
      scannedResult.name,
      scannedResult.phone || "+855 12 000 000",
      scannedResult.email,
      scannedResult.username,
      scannedResult.avatar
    );
    setAddedSuccess(true);
    setScannedResult({
      ...scannedResult,
      isFriend: true,
    });
  };

  const handleStartChatFromScan = () => {
    if (!scannedResult) return;
    const contactObj: Contact = {
      id: scannedResult.id || `c_${scannedResult.username}`,
      name: scannedResult.name,
      username: scannedResult.username,
      phone: scannedResult.phone || "+855 12 000 000",
      email: scannedResult.email || `${scannedResult.username}@hugi.app`,
      avatar: scannedResult.avatar,
      bio: scannedResult.bio,
      isOnline: true,
    };
    onStartChat(contactObj);
    onClose();
  };

  const handleResetScan = () => {
    setScannedResult(null);
    setAddedSuccess(false);
    setIsScanning(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-4 border border-gray-100 relative animate-in fade-in zoom-in-95 font-sans text-black overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-[#111111] font-bold hover:text-black font-bold p-1.5 rounded-full bg-white/80 hover:bg-gray-100 transition-colors shadow-2xs"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-3">
          <h2 className="text-lg font-bold text-black">
            ស្កេន QR Code (Scan QR)
          </h2>
          <p className="text-xs font-bold text-[#111111] font-bold mt-0.5">
            ស្កេន QR Code របស់មិត្តភក្តិដើម្បីបន្ថែម ឬជជែក
          </p>
        </div>

        {/* View 1: Active Scanning View */}
        {!scannedResult ? (
          <div>
            {/* Camera Viewport with Frame */}
            <div className="relative w-full h-64 bg-gray-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center mb-3.5">
              {/* Video Element */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                autoPlay
                playsInline
              />

              {/* Hidden Canvas for QR Extraction */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Error overlay if camera blocked */}
              {cameraError && (
                <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center p-4 text-center z-10 text-white">
                  <Camera className="w-8 h-8 text-[#111111] font-bold mb-2" />
                  <p className="text-xs font-bold text-slate-400 mb-3 leading-relaxed">
                    {cameraError}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#6C63FF] hover:bg-[#5a51e6] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>ជ្រើសរើសរូបពី Gallery</span>
                  </button>
                </div>
              )}

              {/* Scanner Frame Overlay */}
              {!cameraError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Outer dim mask */}
                  <div className="w-48 h-48 relative border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    {/* Frame corners */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#6C63FF] rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#6C63FF] rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#6C63FF] rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#6C63FF] rounded-br-lg" />

                    {/* Animated Scanning Laser Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#6C63FF] to-transparent shadow-[0_0_8px_#6C63FF] animate-bounce-slow mt-8" />
                  </div>
                </div>
              )}

              {/* Torch button on top right of video */}
              {!cameraError && (
                <button
                  onClick={toggleTorch}
                  className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  title="Flashlight"
                >
                  {torchOn ? (
                    <Flashlight className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <FlashlightOff className="w-4 h-4 text-white/80" />
                  )}
                </button>
              )}
            </div>

            {/* Gallery Picker button */}
            <div className="mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 bg-[#F5F7FA] hover:bg-gray-100 text-black font-bold rounded-xl text-xs flex items-center justify-center space-x-2 border border-gray-200 transition-colors shadow-2xs"
              >
                <ImageIcon className="w-4 h-4 text-[#6C63FF]" />
                <span>ជ្រើសរូបភាព QR Code ពី Gallery</span>
              </button>
            </div>

            {/* Manual Search Form by @username */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[11px] text-[#111111] font-bold mb-1.5 font-bold">
                ឬបញ្ចូល @username ដោយផ្ទាល់៖
              </p>
              <form onSubmit={handleManualSearch} className="flex space-x-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-xs text-[#111111] font-bold">
                    @
                  </span>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="makara, sokha, dara..."
                    className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2 pl-7 pr-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#6C63FF] hover:bg-[#5a51e6] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs flex items-center space-x-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>ស្វែងរក</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* View 2: Scanned Result Card */
          <div className="animate-in fade-in zoom-in-95">
            <div className="bg-[#F5F7FA] rounded-2xl p-4 border border-gray-200 text-center mb-4 relative">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-[#6C63FF]/10 text-[#6C63FF] font-bold text-xl flex items-center justify-center border-2 border-white shadow-2xs overflow-hidden mx-auto mb-2.5">
                {scannedResult.avatar && !scannedResult.avatar.includes("unsplash") ? (
                  <img
                    src={scannedResult.avatar}
                    alt={scannedResult.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{scannedResult.name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* Name & Username */}
              <h3 className="text-base font-bold text-black">
                {scannedResult.name}
              </h3>
              <div className="text-xs text-[#6C63FF] font-bold mb-2">
                @{scannedResult.username}
              </div>

              {scannedResult.bio && (
                <p className="text-xs font-bold text-black font-bold max-w-xs mx-auto mb-2 leading-relaxed">
                  {scannedResult.bio}
                </p>
              )}

              {/* Status Pill */}
              <div className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold mt-1">
                {scannedResult.isSelf ? (
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    នេះជាគណនីរបស់អ្នកផ្ទាល់
                  </span>
                ) : scannedResult.isFriend ? (
                  <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>ជាមិត្តភក្តិរួចហើយ</span>
                  </span>
                ) : (
                  <span className="bg-indigo-100 text-[#6C63FF] px-2.5 py-0.5 rounded-full">
                    បានរកឃើញអ្នកប្រើប្រាស់ Hugi
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {!scannedResult.isSelf && !scannedResult.isFriend && (
                <button
                  onClick={handleAddFriend}
                  className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] active:scale-98 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs flex items-center justify-center space-x-2 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>បន្ថែមជាមិត្តភក្តិ (Add Friend)</span>
                </button>
              )}

              {!scannedResult.isSelf && (
                <button
                  onClick={handleStartChatFromScan}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs flex items-center justify-center space-x-2 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>ជជែកឥឡូវនេះ (Chat Now)</span>
                </button>
              )}

              <button
                onClick={handleResetScan}
                className="w-full bg-white hover:bg-gray-50 text-black font-bold py-2.5 px-4 rounded-xl text-xs border border-gray-200 shadow-2xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-black font-bold" />
                <span>ស្កេនម្តងទៀត (Scan Again)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
