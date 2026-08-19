import os

content = """
import React, { useState, useRef, useEffect } from "react";
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
  Edit3,
  MessageSquare,
  Sparkles,
  MapPin,
  ShieldCheck,
  X,
  Settings,
  ChevronRight,
  ExternalLink,
  Send,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  Heart,
  Calendar,
  Activity
} from "lucide-react";
import { User, Contact } from "../types";
import { StorageService } from "../services/storage";
import { FirebaseService, auth } from "../services/firebase";
import { HugiLogo } from "../components/HugiLogo";
import { getCleanUserInviteLink, formatInviteMessage, shareUserInvite } from "../utils/share";
import { MyQRCodeModal } from "../components/MyQRCodeModal";
import { sanitizeAvatarUrl, getRealAvatar } from "../utils/avatars";
import { compressAndResizeImage } from "../utils/image";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

interface ProfileViewProps {
  user: User;
  onUpdateProfile: (updated: User) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onOpenMyQR?: () => void;
  onOpenScanQR?: () => void;
  onStartChat?: (contact: Contact) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
  onOpenMyQR,
  onOpenScanQR,
  onStartChat,
}) => {
  // Main Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings Sub-modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  
  // Profile Form State
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || "");
  const [hobbies, setHobbies] = useState(user.hobbies || "");
  const [lookingFor, setLookingFor] = useState(user.lookingFor || "");
  const [birthYear, setBirthYear] = useState(user.birthYear || "");
  const [maritalStatus, setMaritalStatus] = useState(user.maritalStatus || "");
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Privacy Form State
  const [showPhone, setShowPhone] = useState(user.showPhone !== false);
  const [showEmail, setShowEmail] = useState(user.showEmail !== false);
  const [showHobbies, setShowHobbies] = useState(user.showHobbies !== false);
  const [showLookingFor, setShowLookingFor] = useState(user.showLookingFor !== false);
  const [showBirthYear, setShowBirthYear] = useState(user.showBirthYear !== false);
  const [showMaritalStatus, setShowMaritalStatus] = useState(user.showMaritalStatus !== false);
  
  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // General State
  const [isSaving, setIsSaving] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUsername = user.username.trim().toLowerCase().replace(/^@/, "") || "user";

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAndResizeImage(file);
        setAvatarFile(compressed);
        const reader = new FileReader();
        reader.onload = (event) => {
          setAvatar(event.target?.result as string);
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        console.error("Avatar compress error:", err);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    
    try {
      let finalAvatarUrl = user.avatar || "";
      if (avatarFile) {
        finalAvatarUrl = await FirebaseService.uploadMedia(`avatars/${user.id}.jpg`, avatarFile);
      }

      const updatedUser: User = {
        ...user,
        name: name.trim(),
        bio: bio.trim(),
        hobbies: hobbies.trim(),
        lookingFor: lookingFor.trim(),
        birthYear: birthYear.trim(),
        maritalStatus: maritalStatus as any,
        avatar: finalAvatarUrl,
      };

      await FirebaseService.updateUser(updatedUser);
      StorageService.setCurrentUser(updatedUser);
      onUpdateProfile(updatedUser);
      setShowEditProfile(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setIsSaving(true);
    try {
      const updatedUser: User = {
        ...user,
        showPhone,
        showEmail,
        showHobbies,
        showLookingFor,
        showBirthYear,
        showMaritalStatus,
      };
      await FirebaseService.updateUser(updatedUser);
      StorageService.setCurrentUser(updatedUser);
      onUpdateProfile(updatedUser);
      setShowPrivacy(false);
    } catch (err) {
      console.error("Failed to save privacy settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordError("សូមបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន និងពាក្យសម្ងាត់ថ្មី");
      return;
    }
    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess(false);
    
    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        throw new Error("No authenticated user");
      }
      
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setShowChangePassword(false), 2000);
    } catch (err: any) {
      console.error("Change password error:", err);
      setPasswordError("ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ ឬមានបញ្ហាផ្សេងទៀត");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const copyUsername = () => {
    navigator.clipboard.writeText(currentUsername);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2000);
  };

  const displayAvatar = getRealAvatar(avatarFile ? avatar : user.avatar, currentUsername);
  
  const renderMaritalStatus = (status?: string) => {
    switch (status) {
      case "single": return "នៅលីវ (Single)";
      case "married": return "រៀបការរួច (Married)";
      case "divorced": return "លែងលះ (Divorced)";
      case "complicated": return "ស្មុគស្មាញ (Complicated)";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-24 max-w-md mx-auto bg-gray-50 font-sans text-black relative">
      {/* Settings Button */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors shadow-sm"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-white pb-6 shadow-sm relative overflow-hidden">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-[#6C63FF] to-[#8B80F9]"></div>
        
        <div className="flex flex-col items-center -mt-16 px-4">
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-100 overflow-hidden relative">
            {displayAvatar ? (
              <img src={displayAvatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[#6C63FF] bg-[#6C63FF]/10">
                {user.name.charAt(0)}
              </div>
            )}
          </div>
          
          <h1 className="mt-3 text-2xl font-bold text-black">{user.name}</h1>
          <p className="text-sm font-bold text-[#6C63FF] mt-1" onClick={copyUsername}>
            @{currentUsername} {copiedUsername && <span className="text-emerald-500 text-xs ml-1">(Copied!)</span>}
          </p>
          
          {user.bio && (
            <p className="mt-4 text-center text-sm font-bold text-[#111111] max-w-xs px-2">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {/* Profile Details List */}
      <div className="px-4 py-4 space-y-4">
        {user.hobbies && user.showHobbies !== false && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#111111] uppercase tracking-wider">ចំណងចំណូលចិត្ត</p>
              <p className="text-sm font-bold text-black mt-1">{user.hobbies}</p>
            </div>
          </div>
        )}
        
        {user.lookingFor && user.showLookingFor !== false && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#111111] uppercase tracking-wider">ចំណូលចិត្តលេង/ចង់បានអ្វី</p>
              <p className="text-sm font-bold text-black mt-1">{user.lookingFor}</p>
            </div>
          </div>
        )}

        {user.birthYear && user.showBirthYear !== false && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#111111] uppercase tracking-wider">កើតឆ្នាំ</p>
              <p className="text-sm font-bold text-black mt-1">{user.birthYear}</p>
            </div>
          </div>
        )}

        {user.maritalStatus && user.showMaritalStatus !== false && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#111111] uppercase tracking-wider">ស្ថានភាពគ្រួសារ</p>
              <p className="text-sm font-bold text-black mt-1">{renderMaritalStatus(user.maritalStatus)}</p>
            </div>
          </div>
        )}
      </div>

      {/* --- SETTINGS MAIN MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-gray-50 animate-in slide-in-from-right-full duration-200 font-sans flex flex-col h-full overflow-y-auto">
          <div className="bg-white p-4 flex items-center justify-between border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center space-x-3">
              <button onClick={() => setShowSettings(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <ChevronRight className="w-6 h-6 transform rotate-180 text-black" />
              </button>
              <h2 className="text-lg font-bold text-black">ការកំណត់ (Settings)</h2>
            </div>
          </div>
          
          <div className="p-4 space-y-6 pb-20">
            {/* Account & Security */}
            <div>
              <h3 className="text-sm font-bold text-[#6C63FF] uppercase tracking-wider mb-2 px-2">គណនី & សុវត្ថិភាព</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                <button onClick={() => setShowEditProfile(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="w-5 h-5 text-gray-500" />
                    <span className="font-bold text-black">កែប្រែប្រវត្តិរូប (Edit Profile)</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                <button onClick={() => setShowChangePassword(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-gray-500" />
                    <span className="font-bold text-black">ប្តូរពាក្យសម្ងាត់ (Change Password)</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Privacy & Visibility */}
            <div>
              <h3 className="text-sm font-bold text-[#6C63FF] uppercase tracking-wider mb-2 px-2">ឯកជនភាព</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                <button onClick={() => setShowPrivacy(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-gray-500" />
                    <span className="font-bold text-black">ការបង្ហាញព័ត៌មាន (Privacy Settings)</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                <button onClick={() => { setShowSettings(false); if(onOpenMyQR) onOpenMyQR(); }} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left">
                  <div className="flex items-center space-x-3">
                    <QrCode className="w-5 h-5 text-gray-500" />
                    <span className="font-bold text-black">QR Code របស់ខ្ញុំ</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Danger Zone */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                <button onClick={onLogout} className="w-full flex items-center space-x-3 p-4 hover:bg-red-50 active:bg-red-100 transition-colors text-left text-red-600">
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold">ចាកចេញ (Log Out)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT PROFILE MODAL --- */}
      {showEditProfile && (
        <div className="fixed inset-0 z-[60] bg-white animate-in slide-in-from-right-full duration-200 font-sans flex flex-col h-full overflow-y-auto">
          <div className="bg-white p-4 flex items-center justify-between border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center space-x-3">
              <button onClick={() => setShowEditProfile(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-6 h-6 text-black" />
              </button>
              <h2 className="text-lg font-bold text-black">កែប្រែប្រវត្តិរូប</h2>
            </div>
            <button onClick={handleSaveProfile} disabled={isSaving} className="text-[#6C63FF] font-bold">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'រក្សាទុក'}
            </button>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-100">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[#6C63FF] bg-[#6C63FF]/10">{name.charAt(0)}</div>
                  )}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#6C63FF] text-white flex items-center justify-center shadow-md border-2 border-white">
                  <Camera className="w-4 h-4" />
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarSelect} className="hidden" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">ឈ្មោះបង្ហាញ (Name)</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">ជីវប្រវត្តិ (Bio)</label>
                <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-[#6C63FF] resize-none"></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">ចំណងចំណូលចិត្ត (Hobbies)</label>
                <input type="text" value={hobbies} onChange={e=>setHobbies(e.target.value)} placeholder="ឧទាហរណ៍: លេងហ្គីតា, អានសៀវភៅ" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">ចំណូលចិត្តលេង/ចង់បានអ្វី (Looking For)</label>
                <input type="text" value={lookingFor} onChange={e=>setLookingFor(e.target.value)} placeholder="ឧទាហរណ៍: រកមិត្តភក្តិថ្មី, ជជែកកម្សាន្ត" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">កើតឆ្នាំណា (Birth Year)</label>
                <input type="text" value={birthYear} onChange={e=>setBirthYear(e.target.value)} placeholder="ឧទាហរណ៍: 1999" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">ស្ថានភាពគ្រួសារ (Marital Status)</label>
                <select value={maritalStatus} onChange={e=>setMaritalStatus(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-[#6C63FF] appearance-none">
                  <option value="">ជ្រើសរើស (Select)</option>
                  <option value="single">នៅលីវ (Single)</option>
                  <option value="married">រៀបការរួច (Married)</option>
                  <option value="divorced">លែងលះ (Divorced)</option>
                  <option value="complicated">ស្មុគស្មាញ (Complicated)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PRIVACY SETTINGS MODAL --- */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[60] bg-gray-50 animate-in slide-in-from-right-full duration-200 font-sans flex flex-col h-full overflow-y-auto">
          <div className="bg-white p-4 flex items-center justify-between border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center space-x-3">
              <button onClick={() => setShowPrivacy(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-6 h-6 transform rotate-180 text-black" />
              </button>
              <h2 className="text-lg font-bold text-black">ការបង្ហាញព័ត៌មាន</h2>
            </div>
            <button onClick={handleSavePrivacy} disabled={isSaving} className="text-[#6C63FF] font-bold">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'រក្សាទុក'}
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <p className="text-sm font-bold text-[#111111] mb-4">ជ្រើសរើសព័ត៌មានដែលអ្នកចង់បង្ហាញនៅលើ Profile របស់អ្នកដល់អ្នកដទៃ។</p>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
              <div className="flex items-center justify-between p-4">
                <div>
                  <h4 className="font-bold text-black text-sm">បង្ហាញចំណងចំណូលចិត្ត</h4>
                </div>
                <button onClick={() => setShowHobbies(!showHobbies)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${showHobbies ? 'bg-[#6C63FF]' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${showHobbies ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <h4 className="font-bold text-black text-sm">បង្ហាញចំណូលចិត្តលេង/ចង់បានអ្វី</h4>
                </div>
                <button onClick={() => setShowLookingFor(!showLookingFor)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${showLookingFor ? 'bg-[#6C63FF]' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${showLookingFor ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <h4 className="font-bold text-black text-sm">បង្ហាញឆ្នាំកំណើត</h4>
                </div>
                <button onClick={() => setShowBirthYear(!showBirthYear)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${showBirthYear ? 'bg-[#6C63FF]' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${showBirthYear ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <h4 className="font-bold text-black text-sm">បង្ហាញស្ថានភាពគ្រួសារ</h4>
                </div>
                <button onClick={() => setShowMaritalStatus(!showMaritalStatus)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${showMaritalStatus ? 'bg-[#6C63FF]' : 'bg-gray-200'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${showMaritalStatus ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CHANGE PASSWORD MODAL --- */}
      {showChangePassword && (
        <div className="fixed inset-0 z-[60] bg-gray-50 animate-in slide-in-from-right-full duration-200 font-sans flex flex-col h-full overflow-y-auto">
          <div className="bg-white p-4 flex items-center space-x-3 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            <button onClick={() => setShowChangePassword(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-6 h-6 transform rotate-180 text-black" />
            </button>
            <h2 className="text-lg font-bold text-black">ប្តូរពាក្យសម្ងាត់</h2>
          </div>
          
          <div className="p-4 space-y-4 mt-2">
            {passwordError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold border border-emerald-100 flex items-center">
                <Check className="w-5 h-5 mr-2" />
                បានផ្លាស់ប្តូរពាក្យសម្ងាត់ដោយជោគជ័យ!
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">ពាក្យសម្ងាត់បច្ចុប្បន្ន (Current Password)</label>
              <input 
                type="password" 
                value={currentPassword} 
                onChange={e=>setCurrentPassword(e.target.value)} 
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-[#6C63FF]" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">ពាក្យសម្ងាត់ថ្មី (New Password)</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={e=>setNewPassword(e.target.value)} 
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-[#6C63FF]" 
              />
            </div>
            
            <button 
              onClick={handleChangePassword} 
              disabled={isChangingPassword || !currentPassword || !newPassword}
              className="w-full mt-4 bg-[#6C63FF] text-white py-3.5 rounded-xl font-bold flex items-center justify-center disabled:opacity-50"
            >
              {isChangingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : "រក្សាទុកពាក្យសម្ងាត់ថ្មី"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
"""

with open("src/views/ProfileView.tsx", "w") as f:
    f.write(content)
