import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  QrCode as QrCodeIcon,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { User } from "../types";
import { HugiLogo } from "./HugiLogo";

interface MyQRCodeModalProps {
  user: User;
  onClose: () => void;
}

export const MyQRCodeModal: React.FC<MyQRCodeModalProps> = ({ user, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const username = user.username || "makara";
  const userQrData = JSON.stringify({
    app: "hugi",
    type: "user_profile",
    username: username,
    name: user.name,
    id: user.id,
    avatar: user.avatar || "",
    phone: user.showPhone ? user.phone : "",
  });

  const profileUrl = `https://hugi.app/@${username}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(
      canvasRef.current,
      userQrData,
      {
        width: 240,
        margin: 2,
        color: {
          dark: "#2D3436",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      },
      (err) => {
        if (err) console.error("Error generating QR code:", err);
      }
    );
  }, [userQrData]);

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;

    // Create a higher resolution composition with Hugi header, user info and QR Code
    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    const width = 600;
    const height = 800;
    exportCanvas.width = width;
    exportCanvas.height = height;

    // Background
    ctx.fillStyle = "#F5F7FA";
    ctx.fillRect(0, 0, width, height);

    // White Card
    const cardX = 40;
    const cardY = 50;
    const cardW = 520;
    const cardH = 700;
    const radius = 32;

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fill();

    // Border
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 2;
    ctx.stroke();

    // App Branding Header
    ctx.fillStyle = "#6C63FF";
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Hugi Chat", width / 2, 130);

    ctx.fillStyle = "#718096";
    ctx.font = "500 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("ស្កេនដើម្បីជជែក និងបន្ថែមមិត្តភក្តិ", width / 2, 165);

    // User Name & @username
    ctx.fillStyle = "#2D3436";
    ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(user.name, width / 2, 230);

    ctx.fillStyle = "#6C63FF";
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`@${username}`, width / 2, 265);

    // Draw the QR Code image
    const qrSize = 340;
    const qrX = (width - qrSize) / 2;
    const qrY = 310;
    ctx.drawImage(canvasRef.current, qrX, qrY, qrSize, qrSize);

    // Bottom Footer in Card
    ctx.fillStyle = "#A0AEC0";
    ctx.font = "500 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("hugi.app • ភាសាខ្មែរ", width / 2, 690);

    // Download image
    const dataUrl = exportCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `hugi_qr_${username}.png`;
    link.href = dataUrl;
    link.click();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hugi - @${username}`,
          text: `ស្កេន ឬចុច link ដើម្បីបន្ថែមខ្ញុំនៅលើកម្មវិធី Hugi: @${username}`,
          url: profileUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const initial = (user.name || "M").charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 relative animate-in fade-in zoom-in-95 font-sans text-[#2D3436]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center space-x-1.5 bg-[#6C63FF]/10 text-[#6C63FF] px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <QrCodeIcon className="w-3.5 h-3.5" />
            <span>QR Code ផ្ទាល់ខ្លួន</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            កូដ QR របស់ខ្ញុំ
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            ឱ្យមិត្តភក្តិស្កេនដើម្បីបន្ថែមអ្នកភ្លាមៗ
          </p>
        </div>

        {/* QR Code Presentation Box */}
        <div className="bg-gradient-to-b from-[#F5F7FA] to-gray-50 p-5 rounded-2xl border border-gray-200/80 flex flex-col items-center justify-center relative shadow-2xs mb-4">
          {/* User Info Header in QR Box */}
          <div className="flex items-center space-x-3 mb-3 w-full bg-white px-3.5 py-2.5 rounded-xl border border-gray-100 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-[#6C63FF]/10 text-[#6C63FF] font-bold text-base flex items-center justify-center border border-white shadow-2xs overflow-hidden flex-shrink-0">
              {user.avatar && !user.avatar.includes("unsplash") ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-gray-800 truncate">
                {user.name}
              </h4>
              <div className="text-xs text-[#6C63FF] font-semibold truncate">
                @{username}
              </div>
            </div>
            <HugiLogo size="sm" />
          </div>

          {/* QR Canvas */}
          <div className="bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm relative flex items-center justify-center">
            <canvas ref={canvasRef} className="w-[200px] h-[200px] block" />
            {/* Center Logo Overlay */}
            <div className="absolute inset-0 m-auto w-9 h-9 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center pointer-events-none">
              <div className="w-6 h-6 rounded-lg bg-[#6C63FF] text-white flex items-center justify-center font-black text-xs">
                H
              </div>
            </div>
          </div>

          {/* Username Tag */}
          <div className="mt-3 text-center">
            <span className="text-xs font-semibold text-gray-600 bg-white/90 px-3 py-1 rounded-full border border-gray-200 shadow-2xs">
              hugi.app/@{username}
            </span>
          </div>
        </div>

        {/* Quick Share Links for Other Apps */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(`ជជែកជាមួយខ្ញុំនៅលើ Hugi: @${username}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <span>Telegram</span>
          </a>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`ជជែកជាមួយខ្ញុំនៅលើ Hugi: @${username} ${profileUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <span>WhatsApp</span>
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <span>Facebook</span>
          </a>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleDownloadQR}
            className="py-2.5 px-3 bg-[#F5F7FA] hover:bg-gray-100 active:scale-98 text-gray-700 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-gray-200 shadow-2xs transition-all"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600">បានទាញយក</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-gray-500" />
                <span>ទាញយក PNG</span>
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            className="py-2.5 px-3 bg-[#6C63FF] hover:bg-[#5a51e6] active:scale-98 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-all"
          >
            {shareSuccess || copiedLink ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>បានចម្លងតំណ</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-white" />
                <span>ចែករំលែក QR</span>
              </>
            )}
          </button>
        </div>

        {/* Copy Link Footer */}
        <div className="mt-3 text-center">
          <button
            onClick={handleCopyLink}
            className="text-[11px] text-gray-400 hover:text-[#6C63FF] inline-flex items-center space-x-1 font-medium transition-colors"
          >
            <Copy className="w-3 h-3" />
            <span>{copiedLink ? "បានចម្លង Link រួចរាល់!" : "ចម្លង Link Profile"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
