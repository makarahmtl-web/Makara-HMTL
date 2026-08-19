import React from "react";
import { MessageCircle, CircleDot, Users, User } from "lucide-react";

export type NavTab = "chat" | "story" | "contacts" | "profile";

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadCount?: number;
  hasNewStories?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  unreadCount = 0,
  hasNewStories = false,
}) => {
  const tabs = [
    {
      id: "chat" as NavTab,
      label: "CHAT",
      icon: MessageCircle,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    {
      id: "story" as NavTab,
      label: "STORY",
      icon: CircleDot,
      badgeDot: hasNewStories,
    },
    {
      id: "contacts" as NavTab,
      label: "CONTACTS",
      icon: Users,
    },
    {
      id: "profile" as NavTab,
      label: "PROFILE",
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-2 h-[55px] max-w-md mx-auto sm:rounded-t-2xl shadow-[0_-2px_15px_rgba(0,0,0,0.03)] flex items-center">
      <div className="flex items-center justify-around w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? "bg-[#6C63FF]/10 text-[#6C63FF] font-bold"
                  : "text-[#111111] font-bold hover:text-[#6C63FF] font-bold"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-[18px] h-[18px] transition-transform duration-150 ${
                    isActive ? "scale-105 stroke-[2.2]" : "stroke-[1.8]"
                  }`}
                />
                {/* Numeric Badge */}
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-[#FF6B6B] text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white shadow-2xs">
                    {tab.badge}
                  </span>
                )}
                {/* Dot Badge */}
                {tab.badgeDot && !tab.badge && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#6C63FF] border border-white rounded-full"></span>
                )}
              </div>
              {/* Tab Labels: 11px Compact */}
              <span className="text-[11px] mt-0.5 tracking-tight select-none leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
