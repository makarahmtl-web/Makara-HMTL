import React from "react";
import { HugiLogo } from "./HugiLogo";
import { User } from "../types";
import { ScanLine } from "lucide-react";

interface TopHeaderProps {
  user: User;
  onAvatarClick?: () => void;
  onProfileClick?: () => void;
  onOpenScanQR?: () => void;
  onOpenMyQR?: () => void;
  title?: string;
  subtitle?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  user,
  onAvatarClick,
  onProfileClick,
  onOpenScanQR,
}) => {
  const handleClick = onProfileClick || onAvatarClick;
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "M";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-3 sm:px-4 h-[48px] flex items-center justify-between shadow-2xs">
      {/* Brand Left (App Name: 18px compact) */}
      <div className="flex items-center space-x-2 cursor-pointer select-none">
        <HugiLogo size="sm" />
        <div className="flex items-baseline space-x-1.5">
          <span className="text-[18px] font-bold tracking-tight text-[#6C63FF] leading-none">
            Hugi
          </span>
          <span className="text-[9px] text-[#111111] font-bold tracking-wider uppercase">
            Chat • Story • Contacts
          </span>
        </div>
      </div>

      {/* Right Controls: Quick QR + Profile */}
      <div className="flex items-center space-x-1.5">
        {onOpenScanQR && (
          <button
            onClick={onOpenScanQR}
            className="w-[32px] h-[32px] rounded-full bg-[#F5F7FA] hover:bg-gray-100 text-[#6C63FF] flex items-center justify-center border border-gray-200/80 active:scale-95 transition-all shadow-2xs"
            title="Scan QR Code"
            aria-label="Scan QR Code"
          >
            <ScanLine className="w-[16px] h-[16px]" />
          </button>
        )}

        {/* User Avatar (Profile Picture Compact: 38px) */}
        <button
          onClick={handleClick}
          aria-label="Profile"
          className="relative group focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/40 rounded-full transition-transform active:scale-95"
        >
          <div className="w-[38px] h-[38px] rounded-full bg-indigo-50 text-[#6C63FF] font-bold flex items-center justify-center text-xs border-2 border-[#6C63FF] overflow-hidden shadow-2xs">
            {user.avatar && !user.avatar.includes("unsplash") ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="select-none font-bold text-xs">{initial}</span>
            )}
          </div>
          {user.isOnline && user.showOnlineStatus && (
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full"></span>
          )}
        </button>
      </div>
    </header>
  );
};
