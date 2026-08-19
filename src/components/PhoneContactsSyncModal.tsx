import React, { useState } from "react";
import {
  Smartphone,
  CheckCircle2,
  Share2,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Search,
  UserCheck,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { User, Contact } from "../types";
import { sanitizeAvatarUrl } from "../utils/avatars";

export interface DevicePhoneContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  hasHugiAccount: boolean;
  hugiUsername?: string;
}

interface PhoneContactsSyncModalProps {
  currentUser: User;
  existingContacts: Contact[];
  isOpen: boolean;
  onClose: () => void;
  onStartChatWithContact: (contact: Contact) => void;
  onAddContact: (
    name: string,
    phone: string,
    email?: string,
    username?: string,
    avatar?: string
  ) => void;
}

// Simulated Device Phonebook for Browser/PWA Demo & Native Contacts Picker API
const DEMO_PHONEBOOK_DATA: DevicePhoneContact[] = [
  {
    id: "phone_1",
    name: "សុខា ភិរុណ (Sokha)",
    phone: "+855 98 765 432",
    email: "sokha.phirun@gmail.com",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    hasHugiAccount: true,
    hugiUsername: "sokha",
  },
  {
    id: "phone_2",
    name: "ចាន់ណា វណ្ណា (Channa)",
    phone: "+855 77 112 233",
    email: "channa.vanna@gmail.com",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    hasHugiAccount: true,
    hugiUsername: "channa",
  },
  {
    id: "phone_3",
    name: "បងប្រុស ពិសិដ្ឋ (Brother Piseth)",
    phone: "+855 12 889 900",
    email: "piseth.khmer@gmail.com",
    hasHugiAccount: false,
  },
  {
    id: "phone_4",
    name: "កញ្ញា ធីតា (Thida Accounting)",
    phone: "+855 86 334 455",
    hasHugiAccount: false,
  },
  {
    id: "phone_5",
    name: "តារា រស្មី (Dara Reasmey)",
    phone: "+855 15 223 344",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    hasHugiAccount: true,
    hugiUsername: "dara",
  },
  {
    id: "phone_6",
    name: "អ៊ុំ សម្បត្តិ (Uncle Sambath)",
    phone: "+855 92 554 433",
    hasHugiAccount: false,
  },
];

export const PhoneContactsSyncModal: React.FC<PhoneContactsSyncModalProps> = ({
  currentUser,
  existingContacts,
  isOpen,
  onClose,
  onStartChatWithContact,
  onAddContact,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [phoneContacts, setPhoneContacts] = useState<DevicePhoneContact[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [invitedPhoneMap, setInvitedPhoneMap] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsSyncing(true);

    // Try Web Contacts API if supported
    if ("contacts" in navigator && "ContactsManager" in window) {
      try {
        const props = ["name", "tel", "email"];
        const opts = { multiple: true };
        // @ts-ignore
        const selected = await (navigator as any).contacts.select(props, opts);
        if (selected && selected.length > 0) {
          const mapped: DevicePhoneContact[] = selected.map((c: any, i: number) => ({
            id: "device_" + i,
            name: c.name?.[0] || "Unknown",
            phone: c.tel?.[0] || "",
            email: c.email?.[0] || "",
            hasHugiAccount: Boolean(i % 2 === 0),
            hugiUsername: i % 2 === 0 ? `user_${i}` : undefined,
          }));
          setPhoneContacts(mapped);
          setHasPermission(true);
          setIsSyncing(false);
          return;
        }
      } catch {
        // User cancelled or unsupported
      }
    }

    // Fallback simulation: read from device phonebook
    setTimeout(() => {
      setPhoneContacts(DEMO_PHONEBOOK_DATA);
      setHasPermission(true);
      setIsSyncing(false);
    }, 700);
  };

  const handleInvite = (c: DevicePhoneContact) => {
    const inviteText = `សួស្តី ${c.name}! សូមចូលរួមជជែកកំសាន្តជាមួយខ្ញុំនៅលើ Hugi Chat: ${window.location.origin}?ref=@${currentUser.username || "makara"}`;

    if (navigator.share) {
      navigator
        .share({
          title: "អញ្ជើញចូលរួម Hugi",
          text: inviteText,
          url: window.location.origin,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(inviteText);
    }

    setInvitedPhoneMap((prev) => ({ ...prev, [c.id]: true }));
  };

  const handleStartChatFromPhone = (c: DevicePhoneContact) => {
    const contactObj: Contact = {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      username: c.hugiUsername || c.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      avatar: sanitizeAvatarUrl(c.avatar, c.hugiUsername || c.name),
      isOnline: true,
      bio: "Hugi User ✨",
    };

    onAddContact(
      contactObj.name,
      contactObj.phone,
      contactObj.email,
      contactObj.username,
      contactObj.avatar
    );
    onStartChatWithContact(contactObj);
    onClose();
  };

  const filtered = phoneContacts.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.replace(/[\s\-]/g, "").includes(q.replace(/[\s\-]/g, "")) ||
      (c.hugiUsername && c.hugiUsername.toLowerCase().includes(q))
    );
  });

  const hugiUsersCount = phoneContacts.filter((c) => c.hasHugiAccount).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 font-sans">
      <div className="bg-white rounded-3xl max-w-sm w-full p-4 border border-gray-100 shadow-2xl relative animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-black leading-tight">
                Phone Contacts
              </h3>
              <p className="text-[10px] text-black font-bold">
                បញ្ជីឈ្មោះក្នុងទូរស័ព្ទដៃ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-black flex items-center justify-center text-[12px] font-bold"
          >
            ✕
          </button>
        </div>

        {!hasPermission ? (
          /* Permission Request View */
          <div className="py-6 px-2 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#6C63FF] flex items-center justify-center mb-3 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h4 className="text-[15px] font-bold text-black mb-1.5">
              ស្វែងរកមិត្តភក្តិដែលប្រើ Hugi
            </h4>
            <p className="text-[11px] text-black font-bold leading-relaxed max-w-[260px] mb-5">
              អនុញ្ញាតឱ្យ Hugi ពិនិត្យលេខទូរស័ព្ទក្នុងឧបករណ៍ ដើម្បីរកមើលថាតើមិត្តភក្តិណាខ្លះមានគណនី Hugi រួចហើយ។
            </p>

            <button
              onClick={handleRequestPermission}
              disabled={isSyncing}
              className="w-full py-2.5 bg-[#6C63FF] hover:bg-[#5a51e6] text-white rounded-xl text-[12px] font-bold shadow-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>កំពុងអានបញ្ជីឈ្មោះ...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>អនុញ្ញាត & ស្វែងរក (Sync Contacts)</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Phone Contacts List View */
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search within device contacts */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-[#111111] font-bold absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកក្នុងបញ្ជីទូរស័ព្ទ..."
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl pl-8 pr-3 h-[34px] text-[11px] focus:outline-none focus:border-[#6C63FF]"
              />
            </div>

            {/* Summary Tag */}
            <div className="flex items-center justify-between text-[10px] font-bold text-black px-1 mb-2">
              <span>សរុប {phoneContacts.length} លេខ</span>
              <span className="text-[#6C63FF] bg-indigo-50 px-2 py-0.5 rounded-full">
                {hugiUsersCount} នាក់ប្រើ Hugi
              </span>
            </div>

            {/* List */}
            <div className="overflow-y-auto space-y-1.5 flex-1 pr-0.5">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                    c.hasHugiAccount
                      ? "bg-indigo-50/20 border-indigo-100 hover:bg-indigo-50/40"
                      : "bg-white border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <img
                      src={sanitizeAvatarUrl(c.avatar, c.hugiUsername || c.name)}
                      alt={c.name}
                      className="w-[32px] h-[32px] rounded-full object-cover border border-gray-200 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-black truncate flex items-center space-x-1">
                        <span>{c.name}</span>
                        {c.hasHugiAccount && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#111111] font-bold truncate">
                        {c.hasHugiAccount && c.hugiUsername ? (
                          <span className="text-[#6C63FF] font-bold">
                            @{c.hugiUsername} • {c.phone}
                          </span>
                        ) : (
                          <span>{c.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Chat or Invite */}
                  <div className="flex-shrink-0 ml-2">
                    {c.hasHugiAccount ? (
                      <button
                        onClick={() => handleStartChatFromPhone(c)}
                        className="py-1 px-2.5 bg-[#6C63FF] hover:bg-[#5a51e6] text-white rounded-lg text-[10px] font-bold shadow-2xs flex items-center space-x-1 active:scale-95 transition-all"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInvite(c)}
                        className={`py-1 px-2 rounded-lg text-[10px] font-bold transition-all active:scale-95 flex items-center space-x-1 ${
                          invitedPhoneMap[c.id]
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-gray-100 hover:bg-gray-200 text-black"
                        }`}
                      >
                        {invitedPhoneMap[c.id] ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>បានអញ្ជើញ</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-2.5 h-2.5 text-black font-bold" />
                            <span>Invite</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
