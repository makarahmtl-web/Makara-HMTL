import React from "react";
import { FriendRequest } from "../types";
import { UserCheck, UserX, Clock, Check, X, Sparkles, MessageSquare } from "lucide-react";

interface FriendRequestsBannerProps {
  incomingRequests: FriendRequest[];
  onAccept: (req: FriendRequest) => void;
  onDecline: (req: FriendRequest) => void;
}

export const FriendRequestsBanner: React.FC<FriendRequestsBannerProps> = ({
  incomingRequests,
  onAccept,
  onDecline,
}) => {
  const pendingRequests = incomingRequests.filter((r) => r.status === "pending");

  if (pendingRequests.length === 0) return null;

  return (
    <div className="mb-3 bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/80 rounded-2xl p-3 shadow-2xs animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          <h3 className="text-[12px] font-bold text-gray-900 tracking-tight flex items-center gap-1">
            <span>សំណើមិត្តភក្តិថ្មី (Friend Requests)</span>
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {pendingRequests.length}
            </span>
          </h3>
        </div>
        <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5">
          <Clock className="w-3 h-3" />
          <span>រង់ចាំការឆ្លើយតប</span>
        </span>
      </div>

      <div className="space-y-2">
        {pendingRequests.map((req) => (
          <div
            key={req.id}
            className="bg-white rounded-xl p-2.5 border border-amber-100/90 shadow-2xs flex items-center justify-between hover:border-[#6C63FF]/30 transition-all"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <img
                src={
                  req.fromUserAvatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.fromUserUsername || req.fromUserName}`
                }
                alt={req.fromUserName}
                className="w-[36px] h-[36px] rounded-full object-cover border border-amber-100 flex-shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-[12px] font-bold text-gray-900 truncate">
                  {req.fromUserName}
                </h4>
                <p className="text-[10px] text-[#6C63FF] font-semibold flex items-center space-x-0.5 truncate">
                  <span>@{req.fromUserUsername || "user"}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-400">ចង់ភ្ជាប់ទំនាក់ទំនង</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <button
                onClick={() => onDecline(req)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-500 flex items-center justify-center text-[11px] font-bold active:scale-95 transition-all"
                title="បដិសេធ (Decline)"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onAccept(req)}
                className="py-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold shadow-2xs flex items-center space-x-1 active:scale-95 transition-all"
                title="យល់ព្រម (Accept & Become Friends)"
              >
                <Check className="w-3.5 h-3.5" />
                <span>យល់ព្រម</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
