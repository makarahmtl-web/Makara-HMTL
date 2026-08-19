import React, { useState } from "react";
import { X, Search, MessageCircle, Phone, ArrowRight, AtSign } from "lucide-react";
import { Contact, User } from "../types";
import { sanitizeAvatarUrl } from "../utils/avatars";

interface NewChatModalProps {
  contacts: Contact[];
  currentUser: User;
  onClose: () => void;
  onStartChat: (contact: Contact) => void;
  onAddNewContact: (name: string, phone: string, email?: string, username?: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  contacts,
  currentUser,
  onClose,
  onStartChat,
  onAddNewContact,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const cleanQ = q.replace(/^@/, "");
    return (
      c.name.toLowerCase().includes(q) ||
      (c.username && c.username.toLowerCase().includes(cleanQ)) ||
      c.phone.replace(/\s+/g, "").includes(q.replace(/\s+/g, "")) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    const cleanUsername = newUsername.trim().toLowerCase().replace(/^@/, "");
    onAddNewContact(newName, newPhone, undefined, cleanUsername);
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-4 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh] font-sans text-black">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-[14px] text-black">ការសន្ទនាថ្មី</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#111111] font-bold hover:text-black font-bold p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Contact Input */}
        <div className="my-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#111111] font-bold absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកតាម @username, ឈ្មោះ ឬលេខ..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 h-[38px] text-[12px] focus:outline-none focus:border-[#6C63FF]"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[250px] pr-1">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-4 text-[#111111] font-bold text-[12px]">
              រកមិនឃើញមិត្តភក្តិទេ
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => {
                  onStartChat(contact);
                  onClose();
                }}
                className="p-2 rounded-xl border border-gray-100 hover:bg-[#6C63FF]/5 hover:border-[#6C63FF]/30 flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <img
                    src={sanitizeAvatarUrl(contact.avatar, contact.name)}
                    alt={contact.name}
                    className="w-[32px] h-[32px] rounded-full object-cover border border-gray-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-black truncate group-hover:text-[#6C63FF]">
                      {contact.name}
                    </div>
                    <div className="text-[10px] text-[#111111] font-bold truncate">
                      {contact.username ? `@${contact.username}` : contact.phone}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#6C63FF] transition-colors" />
              </div>
            ))
          )}
        </div>

        {/* Add New Contact Toggle */}
        <div className="pt-2 border-t border-gray-100 mt-2">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2 bg-gray-50 hover:bg-[#6C63FF]/10 text-black hover:text-[#6C63FF] rounded-xl text-[12px] font-bold transition-all border border-gray-200"
            >
              + បន្ថែមមិត្តភក្តិថ្មីដោយផ្ទាល់
            </button>
          ) : (
            <form onSubmit={handleAddSubmit} className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ឈ្មោះ *"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg h-[34px] px-2.5 text-[11px] focus:outline-none focus:border-[#6C63FF]"
                required
              />
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="@username (ស្រេចចិត្ត)"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg h-[34px] px-2.5 text-[11px] focus:outline-none focus:border-[#6C63FF]"
              />
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="លេខទូរស័ព្ទ *"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg h-[34px] px-2.5 text-[11px] focus:outline-none focus:border-[#6C63FF]"
                required
              />
              <div className="flex space-x-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-1.5 rounded-lg bg-gray-100 text-black text-[11px] font-bold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-lg bg-[#6C63FF] text-white text-[11px] font-bold"
                >
                  រក្សាទុក
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
