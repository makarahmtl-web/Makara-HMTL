/**
 * QRScannerPage Component
 * Scan QR Code to add friend or open profile via hugi.app/@username
 */
import React, { useState } from "react";
import { X, ScanLine, CheckCircle2, AlertCircle, UserPlus, ArrowLeft } from "lucide-react";
import { User } from "../types";

interface QRScannerPageProps {
  onClose: () => void;
  onScanSuccess: (username: string) => void;
}

export const QRScannerPage: React.FC<QRScannerPageProps> = ({ onClose, onScanSuccess }) => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [simulatedInput, setSimulatedInput] = useState("");

  const handleScan = (data: string) => {
    if (!data) return;
    setErrorMsg(null);
    if (data.includes("hugi.app/@")) {
      const parts = data.split("@");
      const username = parts[parts.length - 1].trim();
      if (username) {
        setScanResult(username);
      } else {
        setErrorMsg("❌ QR Code នេះមិនមាន Username ត្រឹមត្រូវទេ");
      }
    } else {
      setErrorMsg("❌ QR Code នេះមិនមែនជា Profile QR របស់ Hugi ទេ");
    }
  };

  const simulateTestScan = () => {
    // Demo scan for testing
    handleScan("https://hugi.app/@makara");
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F7FA] max-w-md mx-auto flex flex-col h-screen font-sans text-[#2D3436]">
      {/* Header */}
      <div className="h-[48px] bg-white border-b border-gray-100 flex items-center justify-between px-3 shadow-2xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-1 -ml-1 text-gray-500 hover:text-[#6C63FF] hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
          <h2 className="text-[15px] font-black text-gray-900 tracking-tight">
            📷 ស្កេន QR Code
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
        <p className="text-xs text-gray-500 mb-6">
          ស្កេន QR Code ដើម្បីស្វែងរក និងបន្ថែមមិត្តភក្តិនៅលើ Hugi
        </p>

        {/* Scanner Viewfinder Box */}
        <div className="relative w-64 h-64 bg-black rounded-2xl overflow-hidden shadow-lg flex items-center justify-center border-2 border-[#6C63FF]/30">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <ScanLine className="w-16 h-16 text-[#6C63FF]/50 animate-pulse" />
          </div>
          <div className="absolute inset-0 border-2 border-[#6C63FF] rounded-2xl pointer-events-none" />
          
          {/* Simulated Camera Feed overlay */}
          <div className="absolute bottom-3 text-[10px] text-white/70 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs">
            កំពុងដំណើរការកាមេរ៉ា...
          </div>
        </div>

        {/* Quick Demo Scan Button */}
        <button
          onClick={simulateTestScan}
          className="mt-4 px-3 py-1.5 bg-[#6C63FF]/10 text-[#6C63FF] hover:bg-[#6C63FF]/20 rounded-xl text-[11px] font-bold transition-all"
        >
          ✨ ចុចទីនេះដើម្បីសាកល្បងស្កេន (@makara)
        </button>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-2 text-red-600 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Result Box */}
        {scanResult && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm w-full max-w-xs animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>រកឃើញ: @{scanResult}</span>
            </div>
            <p className="text-[11px] text-gray-600 mb-3">
              តើអ្នកចង់បន្ថែមអ្នកប្រើប្រាស់នេះជាមិត្តភក្តិ ឬទេ?
            </p>
            <button
              onClick={() => onScanSuccess(scanResult)}
              className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>បន្ថែមមិត្តភក្តិ (Add Friend)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
