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
  Compass,
  MapPin,
  Check,
} from "lucide-react";
import { Contact, User, FriendRequest } from "../types";
import { FirebaseService } from "../services/firebase";
import { FriendRequestsBanner } from "../components/FriendRequestsBanner";
import { shareUserInvite } from "../utils/share";
import { sanitizeAvatarUrl } from "../utils/avatars";

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

type FilterTab = "all" | "suggested" | "online" | "requests";

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

  // Automatic Friend Discovery (Suggested Users in Cambodia from Firestore `profiles`)
  const [suggestedUsers, setSuggestedUsers] = useState<Contact[]>([]);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(true);

  // Add Contact Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const pendingIncomingRequests = friendRequests.filter(
    (r) => r.toUserId === currentUser.id && r.status === "pending"
  );

  // Fetch registered Cambodian users automatically for Suggested Friends
  useEffect(() => {
    setIsLoadingSuggested(true);
    FirebaseService.getSuggestedUsers(currentUser.id, 25)
      .then((users) => {
        // Exclude users already in contacts
        const existingIds = new Set(contacts.map((c) => c.id));
        const filtered = users.filter((u) => !existingIds.has(u.id));
        setSuggestedUsers(filtered);
      })
      .catch((err) => {
        console.warn("Failed to load suggested contacts:", err);
      })
      .finally(() => {
        setIsLoadingSuggested(false);
      });
  }, [currentUser.id, contacts]);

  // Live Instant Search across Firestore profiles + local contacts
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^@/, "");
    if (!q || q.length < 1) {
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
        console.warn("Live user search error:", err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 250);

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

  const handleShareInvite = async () => {
    const res = await shareUserInvite(currentUser);
    if (res === "copied" || res === "shared") {
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
    const avatar = sanitizeAvatarUrl("", cleanUsername || name);

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
    <div className="flex flex-col min-h-full pb-24 max-w-md mx-auto px-3 pt-2 font-sans text-black">
      {/* 1. Header (Contacts Count, Online Status & Quick Actions) */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h1 className="text-[18px] font-bold text-black tracking-tight leading-tight flex items-center space-x-1.5">
            <span>មិត្តភក្តិ</span>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-[#6C63FF]/10 text-[#6C63FF] rounded-full">
              {contacts.length}
            </span>
          </h1>
          <p className="text-[11px] text-black font-bold mt-0.5 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{onlineCount} នាក់កំពុងអនឡាញ</span>
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Scan QR Button */}
          {onOpenScanQR && (
            <button
              onClick={onOpenScanQR}
              className="py-1 px-2.5 bg-white hover:bg-gray-50 text-[#6C63FF] border border-gray-200 rounded-xl shadow-2xs text-[11px] font-bold flex items-center space-x-1 active:scale-95 transition-all"
              title="Scan QR Code"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>ស្កេន</span>
            </button>
          )}

          {/* My QR Button */}
          {onOpenMyQR && (
            <button
              onClick={onOpenMyQR}
              className="py-1 px-2.5 bg-white hover:bg-gray-50 text-black border border-gray-200 rounded-xl shadow-2xs text-[11px] font-bold flex items-center space-x-1 active:scale-95 transition-all"
              title="My QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-[#6C63FF]" />
              <span>QR ខ្ញុំ</span>
            </button>
          )}

          {/* Add Contact Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-8 h-8 rounded-xl bg-[#6C63FF] hover:bg-[#5a51e6] text-white flex items-center justify-center shadow-xs active:scale-95 transition-all flex-shrink-0"
            aria-label="Add Contact"
            title="បន្ថែមមិត្តភក្តិថ្មី"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Friend Requests Notification Banner */}
      <FriendRequestsBanner
        incomingRequests={pendingIncomingRequests}
        onAccept={onAcceptFriendRequest}
        onDecline={onDeclineFriendRequest}
      />

      {/* 3. Search Bar (Live instant search across Name, @username & Phone) */}
      <div className="mb-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#111111] font-bold absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកតាម @username, ឈ្មោះ ឬលេខ..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-9 pr-8 h-9 text-xs font-bold text-black placeholder:text-[#111111] font-bold focus:outline-none focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-[#111111] font-bold hover:text-black font-bold p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Filter Chips / Segment Tabs */}
      <div className="flex items-center space-x-1.5 mb-2.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center space-x-1 flex-shrink-0 ${
            activeTab === "all"
              ? "bg-[#6C63FF] text-white shadow-2xs"
              : "bg-white text-black font-bold border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Users className="w-3 h-3" />
          <span>មិត្តភក្តិ ({contacts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("suggested")}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center space-x-1 flex-shrink-0 ${
            activeTab === "suggested"
              ? "bg-[#6C63FF] text-white shadow-2xs"
              : "bg-white text-black font-bold border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>អ្នកអាចស្គាល់ ({suggestedUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("online")}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center space-x-1 flex-shrink-0 ${
            activeTab === "online"
              ? "bg-emerald-500 text-white shadow-2xs"
              : "bg-white text-black font-bold border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>អនឡាញ ({onlineCount})</span>
        </button>

        {pendingIncomingRequests.length > 0 && (
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center space-x-1 flex-shrink-0 ${
              activeTab === "requests"
                ? "bg-amber-500 text-white shadow-2xs"
                : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>សំណើមិត្ត ({pendingIncomingRequests.length})</span>
          </button>
        )}
      </div>

      {/* 5. Live Search Results Banner */}
      {searchQuery.trim().length >= 1 && (
        <div className="mb-3 space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>លទ្ធផលស្វែងរកលើ Hugi</span>
            </span>
            {isSearchingGlobal && (
              <Loader2 className="w-3 h-3 animate-spin text-[#6C63FF]" />
            )}
          </div>

          {globalSearchResults.length > 0 ? (
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
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
                        src={sanitizeAvatarUrl(usr.avatar, usr.username || usr.name)}
                        alt={usr.name}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-black truncate flex items-center space-x-1">
                          <span>{usr.name}</span>
                          {isAlreadyContact && (
                            <UserCheck className="w-3 h-3 text-emerald-500 inline" />
                          )}
                        </div>
                        <div className="text-[11px] text-[#6C63FF] font-bold flex items-center space-x-0.5">
                          <AtSign className="w-2.5 h-2.5" />
                          <span>{usr.username}</span>
                        </div>
                        {usr.bio && (
                          <div className="text-[10px] text-[#111111] font-bold truncate">
                            {usr.bio}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {!isAlreadyContact && !hasSentReq && (
                        <button
                          onClick={() => handleSendReq(usr)}
                          className="py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-[#6C63FF] rounded-xl text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1"
                          title="ផ្ញើសំណើមិត្ត"
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>ស្នើសុំ</span>
                        </button>
                      )}

                      <button
                        onClick={() => onStartChat(usr)}
                        className="py-1 px-2.5 bg-[#6C63FF] hover:bg-[#5a51e6] text-white rounded-xl text-xs font-bold shadow-2xs flex items-center space-x-1 active:scale-95 transition-all"
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
          ) : !isSearchingGlobal && searchQuery.trim().length >= 1 ? (
            <div className="p-3 bg-gray-50 rounded-2xl text-center text-xs font-bold text-[#111111] font-bold border border-gray-100">
              មិនបានរកឃើញអ្នកប្រើប្រាស់ "{searchQuery}" ទេ
            </div>
          ) : null}
        </div>
      )}

      {/* 6. SUGGESTED FRIENDS TAB ("មនុស្សដែលអ្នកអាចស្គាល់" / Suggested in Cambodia) */}
      {activeTab === "suggested" && (
        <div className="space-y-2 mb-3">
          <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-2xs">
            <div className="flex items-center space-x-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#6C63FF]" />
              <h3 className="text-xs font-bold text-black uppercase tracking-wide">
                សមាជិកដែលបានចុះឈ្មោះនៅកម្ពុជា 🇰🇭
              </h3>
            </div>
            <p className="text-[11px] text-black font-bold">
              ស្វែងរក និងភ្ជាប់ទំនាក់ទំនងជាមួយមិត្តភក្តិថ្មីៗទូទាំងប្រទេសកម្ពុជា
            </p>
          </div>

          {isLoadingSuggested ? (
            <div className="py-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#6C63FF] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#111111] font-bold">កំពុងស្វែងរកសមាជិកនៅកម្ពុជា...</p>
            </div>
          ) : suggestedUsers.length === 0 ? (
            <div className="p-4 bg-white rounded-2xl text-center text-xs font-bold text-[#111111] font-bold border border-gray-100">
              មិនទាន់មានការណែនាំថ្មីៗនៅឡើយទេ
            </div>
          ) : (
            <div className="space-y-1.5">
              {suggestedUsers.map((usr) => (
                <div
                  key={usr.id}
                  className="p-3 bg-white rounded-2xl border border-gray-100 shadow-2xs hover:border-[#6C63FF]/30 transition-all flex items-center justify-between"
                >
                  <div
                    onClick={() => onStartChat(usr)}
                    className="flex items-center space-x-3 min-w-0 cursor-pointer flex-1"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={sanitizeAvatarUrl(usr.avatar, usr.username || usr.name)}
                        alt={usr.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-100"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-black truncate">
                        {usr.name}
                      </div>
                      <div className="text-[11px] text-[#6C63FF] font-bold flex items-center space-x-0.5">
                        <AtSign className="w-2.5 h-2.5" />
                        <span>{usr.username}</span>
                      </div>
                      <div className="text-[10px] text-black font-bold truncate">
                        {usr.bio || "📍 កម្ពុជា 🇰🇭"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleSendReq(usr)}
                      className="py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-[#6C63FF] rounded-xl text-[10.5px] font-bold transition-all active:scale-95 flex items-center gap-1"
                      title="ផ្ញើសំណើមិត្ត"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>បន្ថែមមិត្ត</span>
                    </button>

                    <button
                      onClick={() => onStartChat(usr)}
                      className="py-1 px-2.5 bg-[#6C63FF] hover:bg-[#5a51e6] text-white rounded-xl text-xs font-bold shadow-2xs flex items-center space-x-1 active:scale-95 transition-all"
                      title="ឆាតភ្លាមៗ"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>ផ្ញើសារ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. ALL / ONLINE CONTACTS LIST */}
      {activeTab !== "suggested" && (
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {/* Automatic Cambodian Discovery Preview Banner on 'All' Tab */}
          {activeTab === "all" && !searchQuery && suggestedUsers.length > 0 && (
            <div className="p-3 bg-gradient-to-r from-indigo-50/80 via-white to-pink-50/50 rounded-2xl border border-indigo-100 shadow-2xs mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#6C63FF]" />
                  <span className="text-xs font-bold text-black">
                    មនុស្សដែលអ្នកអាចស្គាល់ (កម្ពុជា 🇰🇭)
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab("suggested")}
                  className="text-[11px] text-[#6C63FF] font-bold hover:underline"
                >
                  មើលទាំងអស់
                </button>
              </div>

              {/* Horizontal Scroll of Suggested Friends */}
              <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
                {suggestedUsers.slice(0, 8).map((su) => (
                  <div
                    key={su.id}
                    className="w-28 flex-shrink-0 bg-white p-2 rounded-xl border border-gray-100 text-center shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <img
                        src={sanitizeAvatarUrl(su.avatar, su.username || su.name)}
                        alt={su.name}
                        className="w-9 h-9 rounded-full mx-auto mb-1 border border-gray-100 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-[11px] font-bold text-black truncate" title={su.name}>
                        {su.name}
                      </div>
                      <div className="text-[9.5px] text-[#6C63FF] font-bold truncate">
                        @{su.username}
                      </div>
                    </div>
                    <button
                      onClick={() => onStartChat(su)}
                      className="mt-1.5 w-full py-0.5 bg-[#6C63FF] hover:bg-[#5a51e6] active:scale-95 text-white rounded-lg text-[10px] font-bold"
                    >
                      ផ្ញើសារ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredContacts.length === 0 ? (
            <div className="bg-white rounded-3xl p-4 text-center border border-gray-100 shadow-2xs my-2">
              <div className="w-11 h-11 rounded-full bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center mx-auto mb-2.5">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-black">
                រកមិនឃើញមិត្តភក្តិទេ
              </h3>
              <p className="text-[11px] text-[#111111] font-bold mt-1 mb-4 max-w-xs mx-auto">
                {searchQuery
                  ? `មិនមានទិន្នន័យត្រូវនឹង "${searchQuery}" ឡើយ`
                  : "មិនទាន់មានមិត្តភក្តិក្នុងបញ្ជីនៅឡើយទេ"}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full sm:w-auto py-2 px-3.5 bg-[#6C63FF] text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-[#5a51e6] active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>បន្ថែមមិត្តភក្តិ</span>
                </button>
                <button
                  onClick={handleShareInvite}
                  className="w-full sm:w-auto py-2 px-3.5 bg-gray-100 hover:bg-gray-200 text-black rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center space-x-1.5"
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
                className="w-full p-2.5 rounded-2xl bg-white hover:bg-gray-50 border border-gray-100 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-2xs"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Contact Avatar with Online Badge */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#6C63FF]/10 text-[#6C63FF] font-bold text-sm flex items-center justify-center border border-gray-100 overflow-hidden">
                      {contact.avatar && !contact.avatar.includes("unsplash") ? (
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{contact.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {contact.isOnline && (
                      <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"
                        title="Online"
                      ></span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-xs font-bold text-black truncate">
                        {contact.name}
                      </h4>
                      {contact.username && (
                        <span className="text-[10.5px] text-[#6C63FF] font-bold truncate">
                          @{contact.username}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-black font-bold flex items-center space-x-1 truncate mt-0.5">
                      <span>{contact.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Chat Action */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartChat(contact);
                    }}
                    className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-[#6C63FF] text-black font-bold hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                    title="ផ្ញើសារជជែក"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================
          ADD CONTACT MODAL POP-UP
         ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-4 border border-gray-100 relative font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-black">
                  បន្ថែមមិត្តភក្តិថ្មី (Add Contact)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-black font-bold flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-black mb-1">
                  ឈ្មោះមិត្តភក្តិ (Name) *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ឧ. សុខា ភិរុណ"
                  className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl h-9 px-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1">
                  លេខទូរស័ព្ទ (Phone Number) *
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+855 12 345 678"
                  className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl h-9 px-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1">
                  Username (@ ផ្ទាល់ខ្លួន - ស្រេចចិត្ត)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-[#6C63FF]">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="sokha_kh"
                    className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl h-9 pl-7 pr-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black mb-1">
                  អ៊ីមែល (Email - ស្រេចចិត្ត)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sokha@example.com"
                  className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl h-9 px-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white transition-colors"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-black text-xs font-bold transition-all"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#6C63FF] hover:bg-[#5a51e6] text-white text-xs font-bold shadow-xs transition-all"
                >
                  រក្សាទុក និងឆាត
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
