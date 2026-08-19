import React, { useState, useEffect } from "react";
import { HugiLogo } from "../components/HugiLogo";
import { Mail, Lock, User as UserIcon, ArrowRight, CheckCircle2, ShieldCheck, X, FileText, Shield } from "lucide-react";
import { User } from "../types";
import { DEFAULT_USER } from "../services/storage";
import { auth, googleProvider } from "../services/firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [modalMode, setModalMode] = useState<"none" | "email" | "google" | "forgot" | "privacy">("none");
  
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

  // Loading indicator
  const [isLoading, setIsLoading] = useState(false);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser: User = {
          ...DEFAULT_USER,
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Hugi User",
          email: firebaseUser.email || "",
          phone: firebaseUser.phoneNumber || "",
          avatar: firebaseUser.photoURL || DEFAULT_USER.avatar,
        };
        onLoginSuccess(mappedUser);
      }
    });
    return () => unsubscribe();
  }, [onLoginSuccess]);

  // Google Authentication with Firebase
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setEmailError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const mappedUser: User = {
        ...DEFAULT_USER,
        id: firebaseUser.uid,
        name: firebaseUser.displayName || "Google User",
        email: firebaseUser.email || "",
        avatar: firebaseUser.photoURL || DEFAULT_USER.avatar,
      };
      setIsLoading(false);
      onLoginSuccess(mappedUser);
    } catch (err: any) {
      console.error("Firebase Google Auth error:", err);
      setIsLoading(false);
      setEmailError("❌ មិនអាចចូលគណនីជាមួយ Google បានទេ៖ " + (err.message || "បញ្ហាតភ្ជាប់"));
    }
  };

  // Forgot Password Submit with Firebase
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setForgotMessage("");
    setForgotError("");

    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotMessage("✅ យើងបានផ្ញើអ៊ីមែលសម្រាប់កំណត់ពាក្យសម្ងាត់ថ្មីរបស់អ្នកហើយ!");
    } catch (err: any) {
      console.error("Firebase reset password error:", err);
      setForgotError("❌ " + (err.code === "auth/user-not-found" ? "រកមិនឃើញគណនីដែលមានអ៊ីមែលនេះទេ" : "សូមបញ្ចូលអ៊ីមែលឲ្យបានត្រឹមត្រូវ"));
    } finally {
      setIsLoading(false);
    }
  };

  // Email Submit with Firebase Auth (Sign Up or Sign In)
  const handleEmailSubmit = async (e: React.FormEvent) => {
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

    try {
      let resUser;
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        resUser = cred.user;
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        resUser = cred.user;
      }

      const user: User = {
        ...DEFAULT_USER,
        id: resUser.uid,
        name: name || resUser.displayName || (isRegistering ? "អ្នកប្រើប្រាស់ថ្មី" : "Hugi User"),
        username: username || "user_" + Math.floor(Math.random() * 1000),
        email: email,
      };
      setIsLoading(false);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error("Firebase Email Auth error:", err);
      setIsLoading(false);
      if (err.code === "auth/email-already-in-use") {
        setEmailError("❌ អ៊ីមែលនេះត្រូវបានប្រើប្រាស់រួចហើយ");
      } else if (err.code === "auth/wrong-password") {
        setEmailError("❌ ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ");
      } else if (err.code === "auth/user-not-found") {
        setEmailError("❌ រកមិនឃើញគណនីដែលមានអ៊ីមែលនេះទេ");
      } else {
        setEmailError("❌ " + (err.message || "មានបញ្ហាកើតឡើង សូមព្យាយាមម្តងទៀត"));
      }
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
      </div>

      {/* Footer Terms & Privacy Note */}
      <div className="w-full text-center pb-6 z-10 px-4">
        <p className="text-xs text-gray-400 font-normal leading-relaxed">
          ដោយបន្ត អ្នកយល់ព្រមនឹង{" "}
          <button
            type="button"
            onClick={() => setModalMode("privacy")}
            className="text-[#6C63FF] hover:underline font-semibold focus:outline-none transition-colors"
          >
            លក្ខខណ្ឌប្រើប្រាស់
          </button>{" "}
          និង{" "}
          <button
            type="button"
            onClick={() => setModalMode("privacy")}
            className="text-[#6C63FF] hover:underline font-semibold focus:outline-none transition-colors"
          >
            គោលការណ៍ឯកជនភាព
          </button>{" "}
          របស់ Hugi
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

      {/* Privacy Policy Modal */}
      {modalMode === "privacy" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col border border-gray-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 leading-tight">
                    គោលការណ៍ឯកជនភាព Hugi
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">
                    (Hugi Privacy Policy - សីហា ២០២៦)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalMode("none")}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="បិទ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-gray-600 leading-relaxed">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-gray-700">
                <p className="font-medium text-xs text-gray-800">
                  គោលការណ៍ឯកជនភាព Hugi (Hugi Privacy Policy)<br />
                  <span className="text-gray-500 font-normal">(បច្ចុប្បន្នភាពចុងក្រោយ៖ ខែសីហា ឆ្នាំ២០២៦)</span>
                </p>
              </div>

              {/* 1. Introduction */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-xs">
                  ១. សេចក្តីផ្តើម (Introduction)
                </h4>
                <p className="text-gray-600">
                  Hugi ផ្តល់តម្លៃខ្ពស់បំផុតដល់សិទ្ធិឯកជនភាពរបស់អ្នក។ គោលការណ៍នេះពិពណ៌នាអំពីព័ត៌មានដែលយើងប្រមូល របៀបប្រើប្រាស់ និងវិធានការការពារព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក។
                </p>
              </div>

              {/* 2. Data Collection */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-900 text-xs">
                  ២. ព័ត៌មានដែលយើងប្រមូល (Data Collection)
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-gray-600">
                  <li>
                    <strong className="text-gray-800">ព័ត៌មានគណនី (Account Data)៖</strong> ឈ្មោះ, អ៊ីមែល ឬលេខទូរស័ព្ទ, និងរូបថតប្រវត្តិរូប (Avatar)។
                  </li>
                  <li>
                    <strong className="text-gray-800">ខ្លឹមសាររបស់អ្នក (User Content)៖</strong> រាល់អត្ថបទ រូបភាព ឬទិន្នន័យ Story។
                  </li>
                  <li>
                    <strong className="text-gray-800">ទិន្នន័យ Hugi AI (AI Interaction Data)៖</strong> សារ និងសំណួរដែលអ្នកបានវាយផ្ញើដោយផ្ទាល់ទៅកាន់ Hugi AI ត្រូវបានដំណើរការដើម្បីបង្កើតចម្លើយជូនអ្នកភ្លាមៗ និងមិនត្រូវបានបង្ហាញជាសាធារណៈឡើយ។
                  </li>
                  <li>
                    <strong className="text-gray-800">ទិន្នន័យបច្ចេកទេស (Technical Data)៖</strong> ប្រភេទទូរស័ព្ទ/ឧបករណ៍, ប្រព័ន្ធប្រតិបត្តិការ (OS), លេខ IP address, និង App crash logs។
                  </li>
                </ul>
              </div>

              {/* 3. Account, Chat & AI Privacy */}
              <div className="space-y-2 bg-[#6C63FF]/5 p-3.5 rounded-2xl border border-[#6C63FF]/20">
                <h4 className="font-bold text-[#6C63FF] text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#6C63FF] shrink-0" />
                  ៣. ឯកជនភាពនៃគណនី សារឆាត និងប្រព័ន្ធ AI (Account, Chat & AI Privacy)
                </h4>
                <ul className="space-y-2 text-gray-700 text-xs">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-gray-900">ភាពជាឯកជនជាចម្បង (Strictly Private)៖</strong> រាល់ខ្លឹមសារ និងព័ត៌មានក្នុងគណនីរបស់អ្នកត្រូវបានរក្សាជាឯកជនភាពដាច់ខាត។
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-gray-900">ការបំបែកប្រព័ន្ធ AI ពីសារឆាតផ្ទាល់ខ្លួន (AI & Chat Isolation)៖</strong> Hugi AI ដំណើរការដាច់ដោយឡែកពីប្រព័ន្ធសារឆ្លើយឆ្លងរវាងមនុស្ស និងមនុស្ស (1-on-1 Chats)។ AI ដាច់ខាតមិនអាចមើលឃើញ អាន ឬប្រមូលព័ត៌មានពីសារឆាតផ្ទាល់ខ្លួន បញ្ជីទំនាក់ទំនង (Contacts) ឬការផុសរបស់អ្នកឡើយ។
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-gray-900">គ្មានការបង្ហាញសាធារណៈ (No Unauthorized Public Display)៖</strong> យើងដាច់ខាតមិនបង្ហាញ ឬចែករំលែកទិន្នន័យរបស់អ្នកឡើយ។
                    </span>
                  </li>
                </ul>
              </div>

              {/* 4. How We Use Data */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-xs">
                  ៤. របៀបដែលយើងប្រើប្រាស់ព័ត៌មាន (How We Use Data)
                </h4>
                <p className="text-gray-600">
                  គ្រប់គ្រងគណនី, រក្សាទុកទិន្នន័យមានសុវត្ថិភាព, កែលម្អប្រព័ន្ធ, និងផ្ញើការជូនដំណឹងសំខាន់ៗ។
                </p>
              </div>

              {/* 5. Data Security & Retention */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-900 text-xs">
                  ៥. ការរក្សាទុក និងសុវត្ថិភាពទិន្នន័យ (Data Security & Retention)
                </h4>
                <ul className="space-y-1 list-disc list-inside text-gray-600">
                  <li>
                    <strong className="text-gray-800">សុវត្ថិភាពទិន្នន័យ៖</strong> ប្រើប្រាស់សេវាកម្ម Google Firebase ដែលមានបច្ចេកវិទ្យាកូដនីយកម្មស្តង់ដារ (SSL/TLS Encryption)។
                  </li>
                  <li>
                    <strong className="text-gray-800">ការលុបទិន្នន័យ៖</strong> ប្រសិនបើអ្នកលុបគណនី ទិន្នន័យទាំងអស់នឹងត្រូវលុបចេញពី Server។
                  </li>
                </ul>
              </div>

              {/* 6. Data Sharing */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-xs">
                  ៦. ការចែករំលែកទិន្នន័យ (Data Sharing)
                </h4>
                <p className="text-gray-600">
                  មិនលក់ទិន្នន័យ (No Selling) ទៅឱ្យភាគីទីបីឡើយ។
                </p>
              </div>

              {/* 7. User Rights */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-xs">
                  ៧. សិទ្ធិរបស់អ្នក (User Rights)
                </h4>
                <p className="text-gray-600">
                  អ្នកមានសិទ្ធិកែប្រែ ឬស្នើសុំលុបទិន្នន័យគណនីចោលទាំងស្រុងបានគ្រប់ពេល។
                </p>
              </div>

              {/* 8. Children's Privacy */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-xs">
                  ៨. ឯកជនភាពកុមារ (Children's Privacy)
                </h4>
                <p className="text-gray-600">
                  Hugi មិនត្រូវបានបង្កើតឡើងសម្រាប់កុមារដែលមានអាយុក្រោម ១៣ ឆ្នាំឡើយ។
                </p>
              </div>

              {/* 9. Contact Us */}
              <div className="space-y-1 pt-1 border-t border-gray-100">
                <h4 className="font-bold text-gray-900 text-xs">
                  ៩. ការទំនាក់ទំនង (Contact Us)
                </h4>
                <p className="text-gray-600">
                  Email: <a href="mailto:support@hugi.com" className="text-[#6C63FF] hover:underline font-semibold">support@hugi.com</a>
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setModalMode("none")}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#6C63FF] hover:bg-[#5a51e6] active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center"
              >
                បិទ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
