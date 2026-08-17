import React, { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import {
  Camera,
  LogOut,
  Trash2,
  Check,
  Shield,
  User as UserIcon,
  Phone,
  Mail,
  AlertTriangle,
  QrCode,
  AtSign,
  Globe,
  Users,
  UserX,
  Loader2,
  Copy,
  Download,
  Share2,
  ExternalLink,
  Edit3,
  FileText,
} from "lucide-react";
import { User } from "../types";
import { StorageService } from "../services/storage";
import { FirebaseService } from "../services/firebase";
import { HugiLogo } from "../components/HugiLogo";
import { generateProfileQR } from "../services/qr.service";

interface ProfileViewProps {
  user: User;
  onUpdateProfile: (updated: User) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onOpenMyQR?: () => void;
  onOpenScanQR?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
  onOpenMyQR,
}) => {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username || "makara");
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [bio, setBio] = useState(user.bio || "");
  const [phone, setPhone] = useState(user.phone || "+855 12 345 678");
  const [email, setEmail] = useState(user.email || `${user.username || "user"}@hugi.app`);
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [showOnlineStatus, setShowOnlineStatus] = useState(
    user.showOnlineStatus !== false
  );
  const [showPhone, setShowPhone] = useState(user.showPhone !== false);
  const [findableByUsername, setFindableByUsername] = useState<
    "everyone" | "friends" | "nobody"
  >(user.findableByUsername || "everyone");
  const [showPublicQR, setShowPublicQR] = useState(user.showPublicQR !== false);
  const [soundEnabled] = useState(user.soundEnabled !== false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    FirebaseService.saveUserProfile(user).catch(() => {});
  }, []);

  const currentUsername = username.trim().toLowerCase().replace(/^@/, "") || "user";
  const userQrData = JSON.stringify({
    app: "hugi",
    type: "user_profile",
    username: currentUsername,
    name: name || user.name,
    id: user.id,
    avatar: avatar || user.avatar || "",
    phone: showPhone ? phone : "",
  });

  // QR Code Size: 150px Compact
  useEffect(() => {
    if (!qrCanvasRef.current) return;
    QRCode.toCanvas(
      qrCanvasRef.current,
      userQrData,
      {
        width: 150,
        margin: 2,
        color: {
          dark: "#2D3436",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      },
      (err) => {
        if (err) console.error("Error generating inline QR code:", err);
      }
    );
  }, [userQrData]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateUsernameAsync = async (val: string): Promise<boolean> => {
    const clean = val.trim().toLowerCase().replace(/^@/, "");
    if (!clean) {
      setUsernameError("សូមបញ្ចូល Username");
      return false;
    }
    if (clean.length < 3) {
      setUsernameError("Username ត្រូវមានយ៉ាងតិច ៣ តួអក្សរ");
      return false;
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      setUsernameError("Username អាចប្រើតែអក្សរតូច (a-z) លេខ (0-9) និង _ ប៉ុណ្ណោះ");
      return false;
    }

    setIsCheckingUsername(true);
    try {
      const isAvailableInFirestore = await FirebaseService.isUsernameAvailable(clean, user.id);
      const isAvailableLocally = StorageService.isUsernameAvailable(clean, user.id);

      if (!isAvailableInFirestore || !isAvailableLocally) {
        setUsernameError(`@${clean} ត្រូវបានប្រើប្រាស់រួចហើយ សូមជ្រើសរើសឈ្មោះផ្សេង`);
        setIsCheckingUsername(false);
        return false;
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsCheckingUsername(false);
    }

    setUsernameError("");
    return true;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(raw);
    if (usernameError) {
      setUsernameError("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    const isValid = await validateUsernameAsync(cleanUsername);
    if (!isValid) {
      return;
    }

    setIsSaving(true);

    const updated: User = {
      ...user,
      name,
      username: cleanUsername,
      email,
      bio,
      phone,
      avatar,
      showOnlineStatus,
      showPhone,
      findableByUsername,
      showPublicQR,
      soundEnabled,
    };

    await FirebaseService.saveUserProfile(updated, user.username);
    onUpdateProfile(updated);

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Share QR Code
  async function shareQR(platform: string) {
    const link = `https://hugi.app/@${currentUsername}`;
    const message = `សួស្តី! នេះជា QR Code របស់ខ្ញុំនៅលើ Hugi។ សូមបន្ថែមខ្ញុំជាមិត្តភក្តិ! 😊\n\n${link}`;
    
    switch(platform) {
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`);
        break;
      default:
        // Use Web Share API
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Hugi Profile',
              text: message,
              url: link,
            });
          } catch {
            copyLink();
          }
        } else {
          copyLink();
        }
    }
  }

  // Download QR Code
  function downloadQR() {
    if (!qrCanvasRef.current) return;
    const canvas = qrCanvasRef.current;
    const link = document.createElement('a');
    link.download = `hugi_${currentUsername}_qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  }

  // Copy Link
  function copyLink() {
    const link = `https://hugi.app/@${currentUsername}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const handleCopyLink = copyLink;

  const initial = (name || "M").charAt(0).toUpperCase();

  return (
    <div className="flex flex-col min-h-full pb-20 max-w-md mx-auto px-3 pt-3 font-sans text-[#2D3436]">
      {/* 1. Top Header Title (Compact: 18px font, 10px margin) */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h1 className="text-[18px] font-black text-gray-900 tracking-tight leading-tight">
            គណនីរបស់ខ្ញុំ
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            ព័ត៌មានផ្ទាល់ខ្លួន និងការកំណត់
          </p>
        </div>

        {onOpenMyQR && (
          <button
            onClick={onOpenMyQR}
            className="py-1 px-2.5 bg-white hover:bg-gray-50 text-[#6C63FF] border border-gray-200 rounded-xl shadow-2xs text-[11px] font-bold flex items-center space-x-1 active:scale-95 transition-all"
            title="បង្ហាញ QR Code ពេញ"
          >
            <QrCode className="w-[15px] h-[15px]" />
            <span>កូដ QR</span>
          </button>
        )}
      </div>

      {/* 2. Profile Page Card (Card Padding: 10px, Radius: 10px, Profile Name: 16px, Bio: 12px) */}
      <div className="w-full rounded-xl bg-white border border-gray-100 p-2.5 text-center shadow-2xs mb-2.5 relative overflow-hidden">
        {/* Avatar with Camera Button (Avatar: 38px Compact) */}
        <div className="relative inline-block mb-2">
          <div className="w-[50px] h-[50px] rounded-full bg-[#6C63FF]/10 text-[#6C63FF] font-black text-lg flex items-center justify-center border-2 border-white shadow-2xs overflow-hidden mx-auto">
            {avatar && !avatar.includes("unsplash") ? (
              <img
                src={avatar}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#6C63FF] text-white hover:bg-[#5a51e6] flex items-center justify-center shadow-2xs border border-white hover:scale-105 active:scale-95 transition-all"
            title="ប្តូររូបភាព Profile"
          >
            <Camera className="w-2.5 h-2.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Profile Name: 16px Compact */}
        <h2 className="text-[16px] font-black text-gray-900 tracking-tight leading-tight">
          {name || "User"}
        </h2>

        {/* @username badge */}
        <div className="mt-1 flex items-center justify-center">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center space-x-1 bg-[#6C63FF]/10 hover:bg-[#6C63FF]/15 text-[#6C63FF] px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors active:scale-95"
            title="ចុចដើម្បីចម្លងតំណភ្ជាប់"
          >
            <AtSign className="w-3 h-3" />
            <span>{currentUsername}</span>
            {copiedLink ? (
              <Check className="w-3 h-3 text-emerald-600 ml-0.5" />
            ) : (
              <Copy className="w-3 h-3 opacity-60 ml-0.5" />
            )}
          </button>
        </div>

        {/* Profile Bio: 12px Compact */}
        {bio && (
          <p className="text-gray-500 text-[12px] mt-1.5 px-3 italic leading-relaxed line-clamp-2">
            "{bio}"
          </p>
        )}
      </div>

      {/* 3. Contact Info Card (Card Padding: 10px, Radius: 10px) */}
      <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs mb-2.5">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100">
          <div className="flex items-center space-x-1.5">
            <UserIcon className="w-[15px] h-[15px] text-[#6C63FF]" />
            <h3 className="text-[13px] font-bold text-gray-900">
              ព័ត៌មានទំនាក់ទំនង
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">
            អាចកែសម្រួលបាន
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Phone */}
          <div className="flex items-center space-x-2.5 p-2 bg-[#F5F7FA] rounded-lg border border-gray-100">
            <div className="w-6 h-6 rounded-md bg-white text-[#6C63FF] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Phone className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                លេខទូរស័ព្ទ
              </div>
              <div className="text-[12px] font-semibold text-gray-800 truncate">
                {phone || "មិនទាន់បានបញ្ចូល"}
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center space-x-2.5 p-2 bg-[#F5F7FA] rounded-lg border border-gray-100">
            <div className="w-6 h-6 rounded-md bg-white text-[#6C63FF] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Mail className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                អ៊ីមែល
              </div>
              <div className="text-[12px] font-semibold text-gray-800 truncate">
                {email || `${currentUsername}@hugi.app`}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="flex items-center space-x-2.5 p-2 bg-[#F5F7FA] rounded-lg border border-gray-100">
            <div className="w-6 h-6 rounded-md bg-white text-[#6C63FF] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <FileText className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                អំពីខ្ញុំ (Bio)
              </div>
              <div className="text-[12px] font-semibold text-gray-800 leading-snug">
                {bio || "សួស្តី! ខ្ញុំប្រើប្រាស់ Hugi Chat ✨"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. QR Code Card (Profile Only) */}
      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs mb-2.5 text-center">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100 text-left">
          <div className="flex items-center space-x-1.5">
            <QrCode className="w-[15px] h-[15px] text-[#6C63FF]" />
            <h3 className="text-[13px] font-bold text-gray-900">
              Profile QR Code
            </h3>
          </div>
          <span className="text-[10px] text-[#6C63FF] font-semibold bg-[#6C63FF]/10 px-2 py-0.5 rounded-full">
            @{currentUsername}
          </span>
        </div>

        {/* QR Canvas Box */}
        <div className="flex flex-col items-center justify-center my-1">
          <div className="relative p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm inline-block">
            <canvas ref={qrCanvasRef} className="rounded-lg mx-auto block" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-white shadow-md border-2 border-[#6C63FF] flex items-center justify-center">
                <HugiLogo size="sm" />
              </div>
            </div>
          </div>

          {/* Profile URL Link */}
          <p className="text-[11px] text-gray-500 font-mono mt-2 select-all">
            {generateProfileQR(currentUsername)}
          </p>

          {/* Social Share Buttons */}
          <div className="flex gap-2 mt-3 justify-center w-full">
            <button 
              onClick={() => shareQR('telegram')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 shadow-2xs"
            >
              <span>📱</span> <span>Telegram</span>
            </button>
            <button 
              onClick={() => shareQR('whatsapp')}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 shadow-2xs"
            >
              <span>📱</span> <span>WhatsApp</span>
            </button>
            <button 
              onClick={() => shareQR('facebook')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 shadow-2xs"
            >
              <span>📱</span> <span>Facebook</span>
            </button>
          </div>

          {/* Download & Copy */}
          <div className="flex gap-2 mt-2.5 w-full justify-center">
            <button 
              onClick={downloadQR} 
              className="bg-[#6C63FF] hover:bg-[#5a51e6] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 shadow-2xs"
            >
              <span>⬇️</span> <span>{downloadSuccess ? "បានរក្សាទុក" : "Download PNG"}</span>
            </button>
            <button 
              onClick={copyLink} 
              className="border border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/5 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all active:scale-95"
            >
              <span>📋</span> <span>{copiedLink ? "បានចម្លង!" : "Copy Link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Form Settings & Edit Profile Info Card */}
      <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs mb-2.5">
        <div className="flex items-center space-x-1.5 mb-2.5 pb-1.5 border-b border-gray-100">
          <Edit3 className="w-[15px] h-[15px] text-[#6C63FF]" />
          <h3 className="text-[13px] font-bold text-gray-900">
            កែប្រែព័ត៌មាន (Edit Details)
          </h3>
        </div>

        <form onSubmit={handleSave} className="space-y-2.5">
          {/* Display Name */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              ឈ្មោះបង្ហាញ (Display Name)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ឈ្មោះរបស់អ្នក"
              className="w-full bg-[#F5F7FA] border border-gray-200 rounded-lg h-[38px] px-3 text-[12px] font-medium text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white transition-colors"
              required
            />
          </div>

          {/* Username Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-gray-700">
                Username (@username ផ្ទាល់ខ្លួន)
              </label>
              <span className="text-[10px] text-gray-400 font-medium">មានតែមួយគត់</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[12px] font-bold text-[#6C63FF]">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => validateUsernameAsync(username)}
                placeholder="makara"
                className={`w-full bg-[#F5F7FA] border rounded-lg h-[38px] pl-7 pr-8 text-[12px] font-medium text-[#2D3436] focus:outline-none focus:bg-white transition-colors ${
                  usernameError
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-200 focus:border-[#6C63FF]"
                }`}
                required
              />
              {isCheckingUsername && (
                <div className="absolute right-2.5 top-2.5 text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6C63FF]" />
                </div>
              )}
            </div>
            {usernameError && (
              <p className="text-[10px] text-red-500 mt-1 flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>{usernameError}</span>
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              អ៊ីមែល (Email)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-[#F5F7FA] border border-gray-200 rounded-lg h-[38px] px-3 text-[12px] font-medium text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white transition-colors"
            />
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              លេខទូរស័ព្ទ (Phone)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+855 12 345 678"
              className="w-full bg-[#F5F7FA] border border-gray-200 rounded-lg h-[38px] px-3 text-[12px] font-medium text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white transition-colors"
            />
          </div>

          {/* Bio Field */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              អំពីខ្ញុំ (Bio)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="សរសេរអំពីខ្លួនអ្នក..."
              rows={2}
              className="w-full bg-[#F5F7FA] border border-gray-200 rounded-lg py-2 px-3 text-[12px] text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white resize-none transition-colors"
            />
          </div>

          {/* Privacy Settings Accordion / Sub-card */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <div className="flex items-center space-x-1 mb-1">
              <Shield className="w-3.5 h-3.5 text-[#6C63FF]" />
              <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
                ការកំណត់សុវត្ថិភាព (Privacy)
              </h4>
            </div>

            {/* Who can find me */}
            <div className="bg-[#F5F7FA] rounded-lg p-2.5 border border-gray-100">
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                អ្នកណាអាចស្វែងរកខ្ញុំតាម @username?
              </label>
              <div className="grid grid-cols-3 gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => setFindableByUsername("everyone")}
                  className={`py-1.5 px-1 rounded-md text-[11px] font-bold flex flex-col items-center justify-center space-y-0.5 transition-all ${
                    findableByUsername === "everyone"
                      ? "bg-[#6C63FF] text-white shadow-2xs"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>ទាំងអស់គ្នា</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFindableByUsername("friends")}
                  className={`py-1.5 px-1 rounded-md text-[11px] font-bold flex flex-col items-center justify-center space-y-0.5 transition-all ${
                    findableByUsername === "friends"
                      ? "bg-[#6C63FF] text-white shadow-2xs"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>តែមិត្តភក្តិ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFindableByUsername("nobody")}
                  className={`py-1.5 px-1 rounded-md text-[11px] font-bold flex flex-col items-center justify-center space-y-0.5 transition-all ${
                    findableByUsername === "nobody"
                      ? "bg-[#6C63FF] text-white shadow-2xs"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <UserX className="w-3 h-3" />
                  <span>គ្មាននរណា</span>
                </button>
              </div>
            </div>

            {/* Public QR Toggle */}
            <div className="bg-[#F5F7FA] rounded-lg p-2 border border-gray-100 flex items-center justify-between">
              <div className="pr-2">
                <div className="text-[11px] font-bold text-gray-800">
                  បង្ហាញ QR Code ជាសាធារណៈ
                </div>
                <div className="text-[10px] text-gray-500">
                  អនុញ្ញាតឱ្យអ្នកដទៃស្កេន QR Code
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={showPublicQR}
                  onChange={(e) => setShowPublicQR(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#6C63FF]"></div>
              </label>
            </div>

            {/* Online Status Toggle */}
            <div className="bg-[#F5F7FA] rounded-lg p-2 border border-gray-100 flex items-center justify-between">
              <div className="pr-2">
                <div className="text-[11px] font-bold text-gray-800">
                  បង្ហាញស្ថានភាព Online
                </div>
                <div className="text-[10px] text-gray-500">
                  អនុញ្ញាតឱ្យអ្នកដទៃឃើញថាអ្នក Online
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={showOnlineStatus}
                  onChange={(e) => setShowOnlineStatus(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#6C63FF]"></div>
              </label>
            </div>
          </div>

          {/* Button Text: 13px, Padding: 8px 16px */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] active:scale-[0.98] text-white font-bold py-2 px-4 rounded-xl shadow-xs text-[13px] transition-all duration-200 flex items-center justify-center space-x-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>កំពុងរក្សាទុក...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>បានរក្សាទុកជោគជ័យ!</span>
              </>
            ) : (
              <span>រក្សាទុកការកែប្រែ (Save Changes)</span>
            )}
          </button>
        </form>
      </div>

      {/* 6. Sign Out & Delete Account Actions */}
      <div className="space-y-2 pt-1">
        {/* Sign Out Button (Button Text: 13px, Padding: 8px 16px) */}
        <button
          onClick={onLogout}
          className="w-full bg-white hover:bg-red-50 text-red-600 font-bold py-2 px-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-center space-x-1.5 transition-all duration-150 text-[13px] active:scale-[0.99]"
        >
          <LogOut className="w-3.5 h-3.5 text-red-600" />
          <span>ចាកចេញពីគណនី (Sign Out)</span>
        </button>

        {/* Delete Account Button */}
        <div className="text-center">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-[11px] text-gray-400 hover:text-red-600 font-semibold transition-colors flex items-center justify-center space-x-1 mx-auto py-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>លុបគណនី Hugi ជារៀងរហូត (Delete Account)</span>
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-4 border border-gray-100 text-center animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="font-bold text-[14px] text-gray-900 mb-1">
              លុបគណនីមែនទេ?
            </h3>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយវិញបានទេ។ រាល់ទិន្នន័យសារ និង Story នឹងត្រូវលុប។
            </p>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-[12px] font-bold hover:bg-gray-200"
              >
                បោះបង់
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  onDeleteAccount();
                }}
                className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-[12px] font-bold hover:bg-red-700 shadow-xs"
              >
                យល់ព្រមលុប
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
