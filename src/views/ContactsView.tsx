import React, { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  Phone,
  MessageSquare,
  X,
  QrCode,
  ScanLine,
  AtSign,
  Globe,
  Loader2,
  Users,
  Sparkles,
  Share2,
  CheckCircle2,
  UserCheck,
  Send,
  Clock,
} from "lucide-react";
import { Contact, User, FriendRequest } from "../types";
import { FirebaseService } from "../services/firebase";
import { FriendRequestsBanner } from "../components/FriendRequestsBanner";

interface ContactsViewProps {
  currentUser: User;
  contacts: Contact[];
  friendRequests: FriendRequest[];
  onStartChat: (contact: Contact) => void;
  onAddContact: (
    name: string,
    phone: string,
    email?: string,
    username?: string,
    avatar?: string
  ) => void;
  onSendFriendRequest: (targetUser: Contact | User) => void;
  onAcceptFriendRequest: (req: FriendRequest) => void;
  onDeclineFriendRequest: (req: FriendRequest) => void;
  onOpenScanQR?: () => void;
  onOpenMyQR?: () => void;
}

type FilterTab = "all" | "online" | "requests" | "cloud";

export const ContactsView: React.FC<ContactsViewProps> = ({
  currentUser,
  contacts,
  friendRequests,
  onStartChat,
  onAddContact,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onOpenScanQR,
  onOpenMyQR,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<Contact[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());

  // Add Contact Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const pendingIncomingRequests = friendRequests.filter(
    (r) => r.toUserId === currentUser.id && r.status === "pending"
  );

  // Search Firestore whenever search query changes
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^@/, "");
    if (!q || q.length < 2) {
      setGlobalSearchResults([]);
      setIsSearchingGlobal(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const results = await FirebaseService.searchUsers(searchQuery);
        const filtered = results.filter(
          (r) =>
            r.id !== currentUser.id &&
            r.username?.toLowerCase() !== currentUser.username?.toLowerCase()
        );
        setGlobalSearchResults(filtered);
      } catch (err) {
        console.warn("Global search error:", err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser]);

  const filteredContacts = contacts.filter((c) => {
    if (activeTab === "online" && !c.isOnline) return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const cleanQuery = q.replace(/^@/, "");
    const matchesUsername =
      c.username && c.username.toLowerCase().includes(cleanQuery);
    const matchesName = c.name.toLowerCase().includes(q);
    const normalizedContactPhone = c.phone.replace(/[\s\-\+]/g, "");
    const normalizedQueryPhone = q.replace(/[\s\-\+]/g, "");
    const matchesPhone =
      normalizedQueryPhone.length > 0 &&
      normalizedContactPhone.includes(normalizedQueryPhone);
    const matchesEmail = c.email && c.email.toLowerCase().includes(q);

    return matchesUsername || matchesName || matchesPhone || matchesEmail;
  });

  const onlineCount = contacts.filter((c) => c.isOnline).length;

  const handleShareInvite = () => {
    const inviteUrl = window.location.origin + `?ref=@${currentUser.username || "makara"}`;
    if (navigator.share) {
      navigator
        .share({
          title: "ចូលរួមកម្មវិធី Hugi",
          text: `ជជែកជាមួយខ្ញុំនៅលើ Hugi: @${currentUser.username || "makara"}!`,
          url: inviteUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSendReq = (usr: Contact | User) => {
    onSendFriendRequest(usr);
    setSentRequestIds((prev) => new Set(prev).add(usr.id));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername || name}`;

    onAddContact(name, phone, email, cleanUsername, avatar);

    const newContact: Contact = {
      id: "contact_" + Date.now(),
      name,
      phone,
      email: email || undefined,
      username: cleanUsername || undefined,
      avatar,
      isOnline: true,
    };
    onStartChat(newContact);

    setName("");
    setUsername("");
    setPhone("");
    setEmail("");
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col min-h-full pb-24 max-w-md mx-auto px-3 pt-3 font-sans text-[#2D3436]">
      {/* 1. Header (Compact Mode: App Title 18px, Counter 11px) */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h1 className="text-[18px] font-black text-gray-900 tracking-tight leading-tight flex items-center space-x-1.5">
            <span>មិត្តភក្តិ</span>
            <span className="text-[11px] font-bold px-1.5 py-0.2 bg-[#6C63FF]/10 text-[#6C63FF] rounded-full">
              {contacts.length}
            </span>
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{onlineCount} នាក់កំពុងអនឡាញ</span>
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Scan QR Button */}
          {onOpenScanQR && (
            <button
              onClick={onOpenScanQR}
              className="py-1 px-2.5 bg-white hover:bg-gray-50 text-[#6C63FF] border border-gray-200 rounded-xl shadow-2xs text-[11px] font-semibold flex items-center space-x-1 active:scale-95 transition-all"
              title="Scan QR Code"
            >
              <ScanLine className="w-[14px] h-[14px]" />
              <span className="hidden sm:inline">ស្កេន</span>
            </button>
          )}

          {/* My QR Button */}
          {onOpenMyQR && (
            <button
              onClick={onOpenMyQR}
              className="py-1 px-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl shadow-2xs text-[11px] font-semibold flex items-center space-x-1 active:scale-95 transition-all"
              title="My QR Code"
            >
              <QrCode className="w-[14px] h-[14px] text-[#6C63FF]" />
              <span className="hidden sm:inline">QR ខ្ញុំ</span>
            </button>
          )}

          {/* Add Contact Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-8 h-8 rounded-xl bg-[#6C63FF] hover:bg-[#5a51e6] text-white flex items-center justify-center shadow-xs active:scale-95 transition-all flex-shrink-0"
            aria-label="Add Contact"
            title="បន្ថែមមិត្តភក្តិថ្មី"
          >
            <UserPlus className="w-[16px] h-[16px]" />
          </button>
        </div>
      </div>

      {/* 2. Friend Requests Notification Banner (User A -> Pending -> User B -> Accept/Decline) */}
      <FriendRequestsBanner
        incomingRequests={pendingIncomingRequests}
        onAccept={onAcceptFriendRequest}
        onDecline={onDeclineFriendRequest}
      />

      {/* 3. Search Bar (Input Height: 38px, Font: 12px, Radius: 10px) */}
      <div className="mb-2">
        <div className="relative">
          <Search className="w-[16px] h-[16px] text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកតាម @username, ឈ្មោះ ឬលេខ..."
            className="w-full bg-white border border-gray-200/90 rounded-xl pl-9 pr-8 h-[38px] text-[12px] font-medium text-[#2D3436] placeholder:text-gray-400 focus:outline-none focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Filter Chips */}
      <div className="flex items-center space-x-1.5 mb-2.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center space-x-1 ${
            activeTab === "all"
              ? "bg-[#6C63FF] text-white shadow-2xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Users className="w-3 h-3" />
          <span>មិត្តភក្តិ ({contacts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("online")}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center space-x-1 ${
            activeTab === "online"
              ? "bg-emerald-500 text-white shadow-2xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>អនឡាញ ({onlineCount})</span>
        </button>

        {pendingIncomingRequests.length > 0 && (
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center space-x-1 ${
              activeTab === "requests"
                ? "bg-amber-500 text-white shadow-2xs"
                : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>សំណើមិត្ត ({pendingIncomingRequests.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("cloud")}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center space-x-1 ${
            activeTab === "cloud"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Globe className="w-3 h-3" />
          <span>ស្វែងរកសកល (Cloud)</span>
        </button>
      </div>

      {/* 5. Global Cloud Search Results Banner */}
      {(searchQuery.trim().length >= 2 || activeTab === "cloud") && (
        <div className="mb-3 space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>អ្នកប្រើប្រាស់ Hugi Cloud</span>
            </span>
            {isSearchingGlobal && (
              <Loader2 className="w-3 h-3 animate-spin text-[#6C63FF]" />
            )}
          </div>

          {globalSearchResults.length > 0 ? (
            <div className="bg-white rounded-xl border border-indigo-100 shadow-2xs divide-y divide-gray-50 overflow-hidden">
              {globalSearchResults.map((usr) => {
                const isAlreadyContact = contacts.some(
                  (c) =>
                    c.id === usr.id ||
                    (c.username &&
                      usr.username &&
                      c.username.toLowerCase() === usr.username.toLowerCase())
                );
                const hasSentReq =
                  sentRequestIds.has(usr.id) ||
                  friendRequests.some(
                    (r) =>
                      r.fromUserId === currentUser.id &&
                      r.toUserId === usr.id &&
                      r.status === "pending"
                  );

                return (
                  <div
                    key={usr.id}
                    className="p-2.5 flex items-center justify-between hover:bg-indigo-50/30 transition-colors"
                  >
                    <div
                      onClick={() => onStartChat(usr)}
                      className="flex items-center space-x-2.5 min-w-0 cursor-pointer flex-1"
                    >
                      <img
                        src={
                          usr.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${usr.username || usr.name}`
                        }
                        alt={usr.name}
                        className="w-[36px] h-[36px] rounded-full object-cover border border-gray-200 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-gray-800 truncate flex items-center space-x-1">
                          <span>{usr.name}</span>
                          {isAlreadyContact && (
                            <UserCheck className="w-3 h-3 text-emerald-500 inline" />
                          )}
                        </div>
                        <div className="text-[11px] text-[#6C63FF] font-semibold flex items-center space-x-0.5">
                          <AtSign className="w-2.5 h-2.5" />
                          <span>{usr.username}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {!isAlreadyContact && !hasSentReq && (
                        <button
                          onClick={() => handleSendReq(usr)}
                          className="py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-[#6C63FF] rounded-lg text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1"
                          title="ផ្ញើសំណើមិត្ត (Send Friend Request)"
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>ស្នើសុំមិត្ត</span>
                        </button>
                      )}

                      {!isAlreadyContact && hasSentReq && (
                        <span className="py-1 px-2 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-amber-200">
                          <Clock className="w-2.5 h-2.5" />
                          <span>រង់ចាំការយល់ព្រម</span>
                        </span>
                      )}

                      <button
                        onClick={() => onStartChat(usr)}
                        className="py-1 px-2.5 bg-[#6C63FF] hover:bg-[#5a51e6] text-white rounded-lg text-[11px] font-bold shadow-2xs flex items-center space-x-1 active:scale-95 transition-all"
                        title="ចាប់ផ្តើមជជែក"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>ឆាតភ្លាមៗ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !isSearchingGlobal && searchQuery.trim().length >= 2 ? (
            <div className="p-2.5 bg-gray-50 rounded-xl text-center text-[11px] text-gray-400 border border-gray-100">
              មិនបានរកឃើញអ្នកប្រើប្រាស់ "{searchQuery}" លើ Cloud ទេ
            </div>
          ) : null}
        </div>
      )}

      {/* 6. Contacts List (Chat Name: 13px, Status/Username: 11px, Padding: 10px) */}
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-2xs my-2">
            <div className="w-12 h-12 rounded-full bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center mx-auto mb-2.5">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[14px] text-gray-800">
              រកមិនឃើញមិត្តភក្តិទេ
            </h3>
            <p className="text-[11px] text-gray-400 mt-1 mb-4 max-w-xs mx-auto">
              {searchQuery
                ? `មិនមានទិន្នន័យត្រូវនឹង "${searchQuery}" ឡើយ`
                : "មិនទាន់មានមិត្តភក្តិក្នុងបញ្ជីនៅឡើយទេ"}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full sm:w-auto py-1.5 px-3 bg-[#6C63FF] text-white rounded-xl text-[12px] font-bold shadow-2xs hover:bg-[#5a51e6] active:scale-95 transition-all flex items-center justify-center space-x-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>បន្ថែមមិត្តភក្តិ</span>
              </button>
              <button
                onClick={handleShareInvite}
                className="w-full sm:w-auto py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[12px] font-bold active:scale-95 transition-all flex items-center justify-center space-x-1.5"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">បានចម្លងតំណភ្ជាប់</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>អញ្ជើញមិត្តភក្តិ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => onStartChat(contact)}
              className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs flex items-center justify-between hover:border-[#6C63FF]/30 hover:bg-indigo-50/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {/* Contact Avatar: 36px Compact */}
                <div className="relative flex-shrink-0">
                  <img
                    src={
                      contact.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.name}`
                    }
                    alt={contact.name}
                    className="w-[36px] h-[36px] rounded-full object-cover border border-gray-100"
                  />
                  {contact.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                {/* Contact Info (Chat Name: 13px Compact, Subtitle: 11px) */}
                <div className="min-w-0">
                  <h3 className="font-bold text-[13px] text-gray-800 truncate leading-tight group-hover:text-[#6C63FF] transition-colors">
                    {contact.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-gray-400">
                    {contact.username ? (
                      <span className="text-[#6C63FF] font-semibold flex items-center space-x-0.5">
                        <AtSign className="w-2.5 h-2.5" />
                        <span>{contact.username}</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1">
                        <Phone className="w-2.5 h-2.5" />
                        <span>{contact.phone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Chat Action Button */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartChat(contact);
                  }}
                  className="w-8 h-8 rounded-xl bg-[#6C63FF]/10 hover:bg-[#6C63FF] text-[#6C63FF] hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                  title="ផ្ញើសារជជែក (Start Chat)"
                >
                  <MessageSquare className="w-[15px] h-[15px]" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 7. Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4 border border-gray-100 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-[14px] text-gray-900 mb-3 flex items-center space-x-1.5">
              <UserPlus className="w-4 h-4 text-[#6C63FF]" />
              <span>បន្ថែមមិត្តភក្តិថ្មី</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  ឈ្មោះ (Full Name) *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ឈ្មោះមិត្តភក្តិ"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg h-[38px] px-3 text-[12px] focus:outline-none focus:border-[#6C63FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Username (@username ផ្ទាល់ខ្លួន)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[12px] font-bold text-[#6C63FF]">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }
                    placeholder="username"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg h-[38px] pl-7 pr-3 text-[12px] focus:outline-none focus:border-[#6C63FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  លេខទូរស័ព្ទ (Phone) *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+855 12 345 678"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg h-[38px] px-3 text-[12px] focus:outline-none focus:border-[#6C63FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  អ៊ីមែល (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg h-[38px] px-3 text-[12px] focus:outline-none focus:border-[#6C63FF]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-3 bg-[#6C63FF] hover:bg-[#5a51e6] text-white font-bold py-2 rounded-xl text-[13px] transition-all shadow-xs flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>រក្សាទុក & ចាប់ផ្តើមឆាត</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
