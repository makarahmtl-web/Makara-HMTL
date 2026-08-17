import React, { useState } from "react";
import { HugiLogo } from "../components/HugiLogo";
import { Mail, Phone, Lock, User as UserIcon, ArrowRight, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { User } from "../types";
import { DEFAULT_USER } from "../services/storage";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [modalMode, setModalMode] = useState<"none" | "email" | "phone" | "google" | "forgot">("none");
  
  // Email Form State
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  // Phone OTP State
  const [phone, setPhone] = useState("");
  const [otpStep, setOtpStep] = useState<"input" | "verify">("input");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [phoneError, setPhoneError] = useState("");

  // Loading indicator
  const [isLoading, setIsLoading] = useState(false);

  // Quick Google Sign In
  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        ...DEFAULT_USER,
        name: "Makara HMTL (Google)",
        email: "makarahmtl@gmail.com",
      });
    }, 600);
  };

  // Forgot Password Submit
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setForgotMessage("");
    setForgotError("");

    setTimeout(() => {
      setLoading(false);
      if (!forgotEmail || !forgotEmail.includes("@")) {
        setForgotError("❌ មិនមានគណនីជាមួយអ៊ីមែលនេះទេ ឬអ៊ីមែលមិនត្រឹមត្រូវ");
      } else {
        setForgotMessage("✅ យើងបានផ្ញើអ៊ីមែលសម្រាប់កំណត់ពាក្យសម្ងាត់ថ្មីរបស់អ្នកហើយ!");
      }
    }, 600);
  };

  // Email Submit with exact validation rules
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    if (isRegistering) {
      if (!name.trim() || name.trim().length < 2) {
        setEmailError("ឈ្មោះត្រូវមានយ៉ាងតិច 2 តួ");
        return;
      }
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!username.trim() || username.trim().length < 3 || !usernameRegex.test(username)) {
        setEmailError("@username ត្រូវមានតែអក្សរ លេខ និង _ ប៉ុណ្ណោះ");
        return;
      }
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("សូមបញ្ចូលអ៊ីមែលឲ្យបានត្រឹមត្រូវ");
      return;
    }

    if (password.length < 6) {
      setEmailError("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 6 តួ");
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setEmailError("ពាក្យសម្ងាត់មិនត្រូវគ្នាទេ");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user: User = {
        ...DEFAULT_USER,
        id: "user_" + Date.now(),
        name: name || (isRegistering ? "អ្នកប្រើប្រាស់ថ្មី" : "Makara HMTL"),
        username: username || "user_" + Math.floor(Math.random() * 1000),
        email: email,
      };
      onLoginSuccess(user);
    }, 700);
  };

  // Send Phone OTP
  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setPhoneError("សូមបញ្ចូលលេខទូរស័ព្ទត្រឹមត្រូវ (ឧទាហរណ៍ 012 345 678)");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setOtpStep("verify");
      setTimer(60);
    }, 600);
  };

  // Verify Phone OTP
  const handleVerifyOTP = () => {
    const code = otpCode.join("");
    if (code.length < 6) {
      setPhoneError("សូមបញ្ចូលលេខកូដ OTP ទាំង ៦ ខ្ទង់");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const formattedPhone = phone.startsWith("+855") ? phone : `+855 ${phone.replace(/^0/, "")}`;
      const user: User = {
        ...DEFAULT_USER,
        id: "user_phone_" + Date.now(),
        name: "Hugi Member (" + phone.slice(-4) + ")",
        phone: formattedPhone,
        email: `phone_${phone.replace(/\D/g, "")}@hugi.app`,
      };
      onLoginSuccess(user);
    }, 800);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newArr = [...otpCode];
    newArr[index] = val;
    setOtpCode(newArr);

    // Auto focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-[#2D3436] flex flex-col items-center justify-between p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Top Branding Section */}
      <div className="w-full flex flex-col items-center text-center mt-12 mb-6 z-10">
        <div className="relative mb-3 animate-pulse-subtle">
          <HugiLogo size="xl" withGlow />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-[#6C63FF] mb-1.5 drop-shadow-xs">
          Hugi
        </h1>
        <p className="text-gray-400 font-medium text-xs flex items-center space-x-1.5">
          <span>ជជែក</span>
          <span className="text-[#6C63FF]">•</span>
          <span>Story</span>
          <span className="text-[#6C63FF]">•</span>
          <span>AI ជាភាសាខ្មែរ</span>
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full bg-white rounded-2xl shadow-2xs border border-gray-100 p-6 z-10 flex flex-col space-y-3">
        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-[#6C63FF] hover:bg-[#5b51ea] active:scale-[0.98] text-white font-semibold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center space-x-3 transition-all duration-200"
        >
          {/* Google Icon SVG */}
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 shadow-2xs">
            <svg viewBox="0 0 24 24" className="w-full h-full">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          </div>
          <span className="text-sm tracking-wide">បន្តជាមួយ Google</span>
        </button>

        {/* Email Sign In Button */}
        <button
          onClick={() => {
            setEmailError("");
            setModalMode("email");
          }}
          className="w-full bg-white hover:bg-gray-50 active:scale-[0.98] text-[#2D3436] font-medium py-3 px-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-center space-x-3 transition-all duration-200"
        >
          <Mail className="w-4.5 h-4.5 text-gray-500" />
          <span className="text-sm">បន្តជាមួយអ៊ីមែល</span>
        </button>

        {/* Phone OTP Sign In Button */}
        <button
          onClick={() => {
            setPhoneError("");
            setOtpStep("input");
            setModalMode("phone");
          }}
          className="w-full bg-white hover:bg-gray-50 active:scale-[0.98] text-[#2D3436] font-medium py-3 px-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-center space-x-3 transition-all duration-200"
        >
          <Phone className="w-4.5 h-4.5 text-gray-500" />
          <span className="text-sm">បន្តជាមួយលេខទូរស័ព្ទ (OTP)</span>
        </button>

        {/* Quick Demo Login Option */}
        <div className="pt-2 text-center">
          <button
            onClick={() => onLoginSuccess(DEFAULT_USER)}
            className="text-xs text-[#6C63FF] hover:underline font-semibold tracking-wide py-1 px-3 rounded-lg hover:bg-[#6C63FF]/5 transition-colors"
          >
            ចូលប្រើរហ័សជា Makara HMTL (Demo) →
          </button>
        </div>
      </div>

      {/* Footer Terms Note */}
      <div className="w-full text-center pb-6 z-10 px-4">
        <p className="text-xs text-gray-400 font-normal leading-relaxed">
          ដោយបន្ត អ្នកយល់ព្រមនឹងលក្ខខណ្ឌប្រើប្រាស់របស់ Hugi
        </p>
      </div>

      {/* Email Modal */}
      {modalMode === "email" && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalMode("none")}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-800">
                  {isRegistering ? "បង្កើតគណនី Hugi ថ្មី" : "ចូលគណនីជាមួយអ៊ីមែល"}
                </h3>
                <p className="text-xs text-gray-400">
                  {isRegistering ? "បំពេញព័ត៌មានខាងក្រោម" : "បញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់"}
                </p>
              </div>
            </div>

            {emailError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                {emailError}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {isRegistering && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      ឈ្មោះពេញ (Name)
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ឧ. សុខា ភិរុណ"
                        className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      @Username
                    </label>
                    <div className="relative">
                      <span className="text-gray-400 absolute left-3.5 top-2.5 text-xs font-bold">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="sokha_pirun"
                        className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 text-xs text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  អ៊ីមែល (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  ពាក្យសម្ងាត់ (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="យ៉ាងតិច 6 តួអក្សរ"
                    className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                    required
                  />
                </div>
              </div>

              {isRegistering && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    បញ្ជាក់ពាក្យសម្ងាត់ (Confirm Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="បញ្ចូលពាក្យសម្ងាត់ម្ដងទៀត"
                      className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] text-white font-semibold py-2.5 rounded-xl shadow-xs text-xs transition-colors flex items-center justify-center space-x-2"
              >
                <span>{isRegistering ? "បង្កើតគណនី" : "ចូលគណនី"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setEmailError("");
                }}
                className="text-xs text-[#6C63FF] font-medium hover:underline"
              >
                {isRegistering
                  ? "មានគណនីរួចហើយ? ចូលគណនី"
                  : "មិនទាន់មានគណនី? ចុះឈ្មោះថ្មី"}
              </button>

              {!isRegistering && (
                <button
                  onClick={() => {
                    setModalMode("forgot");
                    setForgotMessage("");
                    setForgotError("");
                  }}
                  className="text-xs text-gray-500 hover:text-[#6C63FF] transition"
                >
                  ❓ ភ្លេចពាក្យសម្ងាត់?
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phone OTP Modal */}
      {modalMode === "phone" && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalMode("none")}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-800">
                  {otpStep === "input" ? "ចូលជាមួយលេខទូរស័ព្ទ" : "ផ្ទៀងផ្ទាត់ OTP"}
                </h3>
                <p className="text-xs text-gray-400">
                  {otpStep === "input"
                    ? "យើងនឹងផ្ញើលេខកូដ ៦ ខ្ទង់តាម SMS"
                    : `កូដផ្ញើទៅកាន់ ${phone}`}
                </p>
              </div>
            </div>

            {phoneError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                {phoneError}
              </div>
            )}

            {otpStep === "input" ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    លេខទូរស័ព្ទកម្ពុជា (+855)
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 flex items-center space-x-1.5">
                      <span>🇰🇭</span>
                      <span>+855</span>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="12 345 678"
                      className="flex-1 bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 px-3.5 text-xs font-medium text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] text-white font-semibold py-2.5 rounded-xl shadow-xs text-xs transition-colors flex items-center justify-center space-x-2"
                >
                  <span>ផ្ញើលេខកូដ OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* 6 Digit Input boxes */}
                <div className="flex justify-between gap-1.5">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      className="w-10 h-11 text-center text-lg font-bold bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:border-[#6C63FF] focus:bg-white focus:ring-2 focus:ring-[#6C63FF]/20 text-[#2D3436]"
                    />
                  ))}
                </div>

                <div className="text-center text-xs text-gray-400">
                  {timer > 0 ? (
                    <span>ផ្ញើកូដឡើងវិញក្នុងរយៈពេល {timer}s</span>
                  ) : (
                    <button
                      onClick={() => setTimer(60)}
                      className="text-[#6C63FF] font-semibold hover:underline"
                    >
                      ផ្ញើលេខកូដម្ដងទៀត
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl shadow-xs text-xs transition-colors flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>ផ្ទៀងផ្ទាត់ និងចូល</span>
                </button>

                <div className="text-center">
                  <button
                    onClick={() => setOtpStep("input")}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    ប្តូរលេខទូរស័ព្ទ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {modalMode === "forgot" && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalMode("email")}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <h3 className="font-bold text-lg text-[#6C63FF]">🔑 ភ្លេចពាក្យសម្ងាត់?</h3>
              <p className="text-xs text-gray-500 mt-1">
                បញ្ចូលអ៊ីមែលរបស់អ្នក ដើម្បីទទួលបានតំណកំណត់ពាក្យសម្ងាត់ថ្មី
              </p>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  អ៊ីមែល (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs text-[#2D3436] focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                    required
                  />
                </div>
              </div>

              {forgotMessage && <p className="text-emerald-600 text-xs font-medium">{forgotMessage}</p>}
              {forgotError && <p className="text-red-500 text-xs font-medium">{forgotError}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] text-white font-semibold py-2.5 rounded-xl shadow-xs text-xs transition-colors flex items-center justify-center space-x-2"
              >
                <span>{isLoading ? "⏳ កំពុងផ្ញើ..." : "📧 ផ្ញើតំណកំណត់ពាក្យសម្ងាត់"}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode("email")}
                  className="text-xs text-gray-500 hover:text-[#6C63FF] transition"
                >
                  ← ត្រឡប់ទៅចូលប្រើ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
