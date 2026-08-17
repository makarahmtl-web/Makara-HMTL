import React from "react";

interface HugiLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  withGlow?: boolean;
}

export const HugiLogo: React.FC<HugiLogoProps> = ({
  size = "md",
  className = "",
  withGlow = false,
}) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-20 h-20 text-base",
    xl: "w-28 h-28 text-lg",
  };

  const pxSizes = {
    sm: 32,
    md: 44,
    lg: 80,
    xl: 112,
  };

  const px = pxSizes[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl flex-shrink-0 transition-transform ${
        withGlow ? "filter drop-shadow-[0_10px_20px_rgba(108,99,255,0.25)]" : ""
      } ${sizeClasses[size]} ${className}`}
    >
      <svg
        viewBox="0 0 120 120"
        width={px}
        height={px}
        className="w-full h-full overflow-visible drop-shadow-sm select-none"
      >
        <defs>
          <radialGradient id="faceGrad" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFF385" />
            <stop offset="65%" stopColor="#FED74C" />
            <stop offset="100%" stopColor="#F5BF26" />
          </radialGradient>
          <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF6B7A" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FA5264" stopOpacity="0.8" />
          </radialGradient>
          <linearGradient id="handGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Head/Face Circle */}
        <circle cx="60" cy="58" r="48" fill="url(#faceGrad)" stroke="#E0A814" strokeWidth="1.5" />

        {/* Rosy Cheeks (Blush) */}
        <ellipse cx="28" cy="46" rx="14" ry="11" fill="url(#blushGrad)" />
        <ellipse cx="92" cy="46" rx="14" ry="11" fill="url(#blushGrad)" />

        {/* Happy Smiling Eyes (Arched squinting eyes) */}
        <path
          d="M 28 32 C 34 22 46 22 52 32"
          fill="none"
          stroke="#472E1B"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M 68 32 C 74 22 86 22 92 32"
          fill="none"
          stroke="#472E1B"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Warm Smiling Mouth */}
        <path
          d="M 40 52 Q 60 74 80 52"
          fill="#472E1B"
          stroke="#472E1B"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left Hugging Hand & Arm */}
        <g filter="url(#softShadow)">
          <path
            d="M 6 88 C 6 74 22 70 38 72 C 44 72 50 75 54 80 C 58 84 57 89 52 92 C 46 94 40 93 36 93 C 48 97 49 104 42 106 C 36 108 30 105 26 104 C 34 109 33 115 26 116 C 18 116 10 108 6 88 Z"
            fill="url(#handGrad)"
            stroke="#94A3B8"
            strokeWidth="1.5"
          />
          {/* Finger lines left */}
          <path d="M 32 78 Q 48 81 50 83" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M 28 90 Q 42 93 45 97" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M 24 100 Q 36 103 38 106" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>

        {/* Right Hugging Hand & Arm */}
        <g filter="url(#softShadow)">
          <path
            d="M 114 88 C 114 74 98 70 82 72 C 76 72 70 75 66 80 C 62 84 63 89 68 92 C 74 94 80 93 84 93 C 72 97 71 104 78 106 C 84 108 90 105 94 104 C 86 109 87 115 94 116 C 102 116 110 108 114 88 Z"
            fill="url(#handGrad)"
            stroke="#94A3B8"
            strokeWidth="1.5"
          />
          {/* Finger lines right */}
          <path d="M 88 78 Q 72 81 70 83" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M 92 90 Q 78 93 75 97" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M 96 100 Q 84 103 82 106" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
};
