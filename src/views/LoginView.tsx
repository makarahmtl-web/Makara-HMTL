import React, { useState, useEffect } from "react";
import { HugiLogo } from "../components/HugiLogo";
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  X,
  Shield,
  RotateCw,
  ArrowLeft,
  Loader2,
  MailCheck,
} from "lucide-react";
import { User } from "../types";
import { DEFAULT_USER } from "../services/storage";
import { auth, googleProvider, FirebaseService } from "../services/firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [modalMode, setModalMode] = useState<"none" | "email" | "verify-email" | "forgot" | "privacy">("none");

  // Email Registration / Sign In Form State
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");

  // Native Firebase Email Verification State
  const [resendCountdown, setResendCountdown] = useState(60);
  const [verifyStatusMsg, setVerifyStatusMsg] = useState("");
  const [verifyErrorMsg, setVerifyErrorMsg] = useState("");
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

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
        // Only auto-proceed if email is verified or logged in with Google provider
        const isGoogle = firebaseUser.providerData.some((p) => p.providerId === "google.com");
        if (firebaseUser.emailVerified || isGoogle) {
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
      }
    });
    return () => unsubscribe();
  }, [onLoginSuccess]);

  // Resend Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (modalMode === "verify-email" && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [modalMode, resendCountdown]);

  // 1. Direct Google Sign-In (Direct, Instant, Zero extra verification steps)
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setEmailError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const cleanUsername = (firebaseUser.email?.split("@")[0] || "user_" + Math.floor(Math.random() * 1000))
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");

      const mappedUser: User = {
        ...DEFAULT_USER,
        id: firebaseUser.uid,
        name: firebaseUser.displayName || "Google User",
        username: cleanUsername,
        email: firebaseUser.email || "",
        avatar: firebaseUser.photoURL || DEFAULT_USER.avatar,
      };

      // Save/sync Firestore user profile
      try {
        await FirebaseService.saveUserProfile(mappedUser);
      } catch (profileErr) {
        console.warn("Google user profile save fallback:", profileErr);
      }

      setIsLoading(false);
      onLoginSuccess(mappedUser);
    } catch (err: any) {
      console.error("Firebase Google Auth error:", err);
      setIsLoading(false);
      if (err.code === "auth/network-request-failed" || String(err.message).includes("network-request-failed")) {
        setEmailError(
          "⚠️ បញ្ហាបណ្តាញទាក់ទងនឹង iFrame Preview! សូមចុចបើកកម្មវិធីក្នុង Tab ថ្មី (Open in a New Tab) នៅជ្រុងខាងលើស្តាំនៃអេក្រង់ Preview ដើម្បីចូលគណនីជាមួយ Google ឬប្រើប្រាស់អ៊ីមែល និងពាក្យសម្ងាត់ជំនួសវិញ។"
        );
      } else {
        setEmailError("❌ មិនអាចចូលគណនីជាមួយ Google បានទេ៖ " + (err.message || "បញ្ហាតភ្ជាប់"));
      }
    }
  };

  // 2. Email Sign Up / Sign In Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("សូមបញ្ចូលអ៊ីមែលឲ្យបានត្រឹមត្រូវ");
      return;
    }

    if (password.length < 6) {
      setEmailError("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 6 តួ");
      return;
    }

    // Direct Sign In for existing accounts
    if (!isRegistering) {
      setIsLoading(true);
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const resUser = cred.user;

        // Check if user has verified their email
        if (!resUser.emailVerified) {
          setIsLoading(false);
          setVerifyErrorMsg("⚠️ សូមផ្ទៀងផ្ទាត់អ៊ីមែលរបស់អ្នកជាមុនសិន ដើម្បីអាចចូលប្រើប្រាស់បាន។");
          setVerifyStatusMsg("");
          setResendCountdown(60);
          setModalMode("verify-email");
          return;
        }

        const user: User = {
          ...DEFAULT_USER,
          id: resUser.uid,
          name: resUser.displayName || "Hugi User",
          email: email,
        };
        setIsLoading(false);
        onLoginSuccess(user);
      } catch (err: any) {
        console.error("Firebase Email Auth error:", err);
        setIsLoading(false);
        if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
          setEmailError("❌ ពាក្យសម្ងាត់ ឬអ៊ីមែលមិនត្រឹមត្រូវទេ");
        } else if (err.code === "auth/user-not-found") {
          setEmailError("❌ រកមិនឃើញគណនីដែលមានអ៊ីមែលនេះទេ");
        } else {
          setEmailError("❌ " + (err.message || "មានបញ្ហាកើតឡើង សូមព្យាយាមម្តងទៀត"));
        }
      }
      return;
    }

    // Registration Validation
    if (!name.trim() || name.trim().length < 2) {
      setEmailError("ឈ្មោះត្រូវមានយ៉ាងតិច 2 តួ");
      return;
    }
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!cleanUsername || cleanUsername.length < 3 || !usernameRegex.test(cleanUsername)) {
      setEmailError("@username ត្រូវមានយ៉ាងតិច 3 តួ (អក្សរ លេខ និង _)");
      return;
    }

    if (password !== confirmPassword) {
      setEmailError("ពាក្យសម្ងាត់មិនត្រូវគ្នាទេ");
      return;
    }

    // Check username availability in Firestore
    setIsLoading(true);
    try {
      const isAvailable = await FirebaseService.isUsernameAvailable(cleanUsername);
      if (!isAvailable) {
        setIsLoading(false);
        setEmailError(`❌ @${cleanUsername} ត្រូវបានគេប្រើប្រាស់រួចហើយ សូមជ្រើសរើសឈ្មោះផ្សេង`);
        return;
      }
    } catch (err) {
      console.warn("Username availability pre-check note:", err);
    }

    // Create Firebase Auth account and trigger native sendEmailVerification
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const resUser = cred.user;

      // Native Firebase verification email
      await sendEmailVerification(resUser);

      const newUser: User = {
        ...DEFAULT_USER,
        id: resUser.uid,
        name: name.trim() || "Hugi User",
        username: cleanUsername || "user_" + Math.floor(Math.random() * 1000),
        email: email.trim(),
      };

      // Save user profile in Firestore
      try {
        await FirebaseService.saveUserProfile(newUser);
      } catch (saveErr) {
        console.warn("Save initial user profile note:", saveErr);
      }

      setIsLoading(false);
      setVerifyStatusMsg("✅ យើងបានផ្ញើតំណភ្ជាប់ផ្ទៀងផ្ទាត់ (Verification Link) ទៅកាន់អ៊ីមែលរបស់អ្នកហើយ!");
      setVerifyErrorMsg("");
      setResendCountdown(60);
      setModalMode("verify-email");
    } catch (err: any) {
      console.error("Firebase Sign Up Error:", err);
      setIsLoading(false);
      if (err.code === "auth/email-already-in-use") {
        setEmailError("❌ អ៊ីមែលនេះត្រូវបានប្រើប្រាស់រួចហើយ សូមត្រឡប់ទៅចូលគណនីវិញ");
      } else if (err.code === "auth/weak-password") {
        setEmailError("❌ ពាក្យសម្ងាត់មិនមានសុវត្ថិភាពគ្រប់គ្រាន់ទេ (យ៉ាងតិច 6 តួ)");
      } else {
        setEmailError("❌ " + (err.message || "មិនអាចបង្កើតគណនីបានទេ សូមព្យាយាមម្តងទៀត"));
      }
    }
  };

  // 3. Check Native Firebase Email Verification Status
  const handleCheckEmailVerified = async () => {
    setIsCheckingVerification(true);
    setVerifyErrorMsg("");
    setVerifyStatusMsg("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setVerifyErrorMsg("❌ សូមចូលគណនីម្តងទៀត");
        setIsCheckingVerification(false);
        return;
      }

      // Reload user data from Firebase Auth backend
      await currentUser.reload();

      if (currentUser.emailVerified) {
        const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
        const verifiedUser: User = {
          ...DEFAULT_USER,
          id: currentUser.uid,
          name: name.trim() || currentUser.displayName || "Hugi User",
          username: cleanUsername || "user_" + Math.floor(Math.random() * 1000),
          email: currentUser.email || email,
          avatar: currentUser.photoURL || DEFAULT_USER.avatar,
        };

        // Update Firestore profile status
        try {
          await FirebaseService.saveUserProfile(verifiedUser);
        } catch (syncErr) {
          console.warn("Sync verified user profile:", syncErr);
        }

        setIsCheckingVerification(false);
        setModalMode("none");
        onLoginSuccess(verifiedUser);
      } else {
        setIsCheckingVerification(false);
        setVerifyErrorMsg(
          "⚠️ អ៊ីមែលរបស់អ្នកមិនទាន់ត្រូវបានផ្ទៀងផ្ទាត់នៅឡើយទេ។ សូមបើកប្រអប់សំបុត្រអ៊ីមែល រួចចុចលើតំណភ្ជាប់ផ្ទៀងផ្ទាត់ជាមុនសិន។"
        );
      }
    } catch (err: any) {
      console.error("Check email verification error:", err);
      setIsCheckingVerification(false);
      setVerifyErrorMsg("❌ មានបញ្ហាក្នុងការពិនិត្យស្ថានភាព៖ " + (err.message || "សូមព្យាយាមម្តងទៀត"));
    }
  };

  // 4. Resend Native Firebase Verification Email
  const handleResendVerificationEmail = async () => {
    if (resendCountdown > 0 || isResendingEmail) return;

    setIsResendingEmail(true);
    setVerifyErrorMsg("");
    setVerifyStatusMsg("");

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
        setResendCountdown(60);
        setVerifyStatusMsg("✅ បានផ្ញើតំណភ្ជាប់ផ្ទៀងផ្ទាត់ថ្មីទៅកាន់អ៊ីមែលរបស់អ្នកហើយ!");
      } else {
        setVerifyErrorMsg("❌ សូមចូលគណនីម្តងទៀត ដើម្បីផ្ញើអ៊ីមែលផ្ទៀងផ្ទាត់");
      }
    } catch (err: any) {
      console.error("Resend verification email error:", err);
      if (err.code === "auth/too-many-requests") {
        setVerifyErrorMsg("⚠️ អ្នកបានស្នើសុំច្រើនដងពេក សូមរង់ចាំបន្តិចសិន");
      } else {
        setVerifyErrorMsg("❌ មិនអាចផ្ញើអ៊ីមែលផ្ទៀងផ្ទាត់បានទេ៖ " + (err.message || "សូមព្យាយាមម្តងទៀត"));
      }
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Switch Account / Logout from unverified state
  const handleSwitchAccount = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out fallback note:", e);
    }
    setModalMode("email");
    setIsRegistering(false);
    setEmailError("");
    setVerifyErrorMsg("");
    setVerifyStatusMsg("");
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
      setForgotError(
        "❌ " + (err.code === "auth/user-not-found" ? "រកមិនឃើញគណនីដែលមានអ៊ីមែលនេះទេ" : "សូមបញ្ចូលអ៊ីមែលឲ្យបានត្រឹមត្រូវ")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-black flex flex-col items-center justify-between p-4 max-w-md mx-auto relative overflow-hidden">
      {/* Top Branding Section */}
      <div className="w-full flex flex-col items-center text-center mt-12 mb-6 z-10">
        <div className="relative mb-3 animate-pulse-subtle">
          <HugiLogo size="xl" withGlow />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-[#6C63FF] mb-1.5 drop-shadow-xs">
          Hugi
        </h1>
        <p className="text-[#111111] font-bold text-xs font-bold flex items-center space-x-1.5">
          <span>ជជែក</span>
          <span className="text-[#6C63FF]">•</span>
          <span>Story</span>
          <span className="text-[#6C63FF]">•</span>
          <span>មិត្តភក្តិ</span>
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full bg-white rounded-2xl shadow-2xs border border-gray-100 p-4 z-10 flex flex-col space-y-3">
        {/* Google Sign In Button (Instant, Direct, Zero OTP / Zero Verification Block) */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-[#6C63FF] hover:bg-[#5b51ea] active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center space-x-3 transition-all duration-200 cursor-pointer disabled:opacity-50"
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
          <span className="text-sm font-bold tracking-wide">បន្តជាមួយ Google (ផ្ទាល់)</span>
        </button>

        {/* Email Sign In / Sign Up Button */}
        <button
          onClick={() => {
            setEmailError("");
            setModalMode("email");
          }}
          className="w-full bg-white hover:bg-gray-50 active:scale-[0.98] text-black font-bold py-3 px-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-center space-x-3 transition-all duration-200 cursor-pointer"
        >
          <Mail className="w-4.5 h-4.5 text-black font-bold" />
          <span className="text-sm font-bold">បន្តជាមួយអ៊ីមែល</span>
        </button>
      </div>

      {/* Footer Terms & Privacy Note */}
      <div className="w-full text-center pb-6 z-10 px-4">
        <p className="text-xs font-bold text-[#111111] font-normal leading-relaxed">
          ដោយបន្ត អ្នកយល់ព្រមនឹង{" "}
          <button
            type="button"
            onClick={() => setModalMode("privacy")}
            className="text-[#6C63FF] hover:underline font-bold focus:outline-none transition-colors"
          >
            លក្ខខណ្ឌប្រើប្រាស់
          </button>{" "}
          និង{" "}
          <button
            type="button"
            onClick={() => setModalMode("privacy")}
            className="text-[#6C63FF] hover:underline font-bold focus:outline-none transition-colors"
          >
            គោលការណ៍ឯកជនភាព
          </button>{" "}
          របស់ Hugi
        </p>
      </div>

      {/* ========================================================
          MODAL 1: Email Form (Sign In / Sign Up Step 1)
          ======================================================== */}
      {modalMode === "email" && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-4 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalMode("none")}
              className="absolute top-4 right-4 text-[#111111] font-bold hover:text-black font-bold p-1.5 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-black">
                  {isRegistering ? "បង្កើតគណនី Hugi ថ្មី" : "ចូលគណនីជាមួយអ៊ីមែល"}
                </h3>
                <p className="text-xs font-bold text-[#111111] font-bold">
                  {isRegistering ? "បំពេញព័ត៌មានដើម្បីបង្កើតគណនី" : "បញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់"}
                </p>
              </div>
            </div>

            {emailError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                {emailError}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {isRegistering && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-black font-bold mb-1">
                      ឈ្មោះពេញ (Name)
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#111111] font-bold absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ឧ. សុខា ភិរុណ"
                        className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black font-bold mb-1">
                      @Username (សម្រាប់ស្វែងរក និង Add Friend)
                    </label>
                    <div className="relative">
                      <span className="text-[#111111] absolute left-3.5 top-2.5 text-xs font-bold">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="sokha_pirun"
                        className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-black font-bold mb-1">
                  អ៊ីមែល (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#111111] font-bold absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black font-bold mb-1">
                  ពាក្យសម្ងាត់ (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#111111] font-bold absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="យ៉ាងតិច 6 តួអក្សរ"
                    className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                    required
                  />
                </div>
              </div>

              {isRegistering && (
                <div>
                  <label className="block text-xs font-bold text-black font-bold mb-1">
                    បញ្ជាក់ពាក្យសម្ងាត់ (Confirm Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#111111] font-bold absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="បញ្ចូលពាក្យសម្ងាត់ម្ដងទៀត"
                      className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] text-white font-bold py-2.5 rounded-xl shadow-xs text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>កំពុងដំណើរការ...</span>
                  </>
                ) : (
                  <>
                    <span>{isRegistering ? "បង្កើតគណនី និងផ្ញើតំណផ្ទៀងផ្ទាត់" : "ចូលគណនី"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setEmailError("");
                }}
                className="text-xs font-bold text-[#6C63FF] font-bold hover:underline cursor-pointer"
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
                  className="text-xs font-bold text-black font-bold hover:text-[#6C63FF] transition cursor-pointer"
                >
                  ❓ ភ្លេចពាក្យសម្ងាត់?
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: Native Firebase Email Verification Screen
          ======================================================== */}
      {modalMode === "verify-email" && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-4 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalMode("none")}
              className="absolute top-4 right-4 text-[#111111] font-bold hover:text-black font-bold p-1.5 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center shrink-0">
                <MailCheck className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-black">
                  ផ្ទៀងផ្ទាត់អ៊ីមែលរបស់អ្នក
                </h3>
                <p className="text-xs font-bold text-[#111111] font-bold">
                  Firebase Native Email Verification
                </p>
              </div>
            </div>

            {/* Email notice badge */}
            <div className="bg-[#6C63FF]/5 border border-[#6C63FF]/15 rounded-2xl p-3.5 mb-4 text-center">
              <p className="text-xs font-bold text-black font-bold">
                យើងបានផ្ញើតំណភ្ជាប់ផ្ទៀងផ្ទាត់ (Link) ទៅកាន់៖
              </p>
              <p className="text-xs font-bold text-[#6C63FF] mt-1 break-all">
                {auth.currentUser?.email || email}
              </p>
            </div>

            {/* Step by step instructions */}
            <div className="bg-gray-50 rounded-2xl p-3.5 mb-4 text-xs font-bold text-black font-bold space-y-2 border border-gray-100">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#6C63FF] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>បើកប្រអប់សំបុត្រ <strong>Inbox</strong> ឬ <strong>Spam</strong> នៃអ៊ីមែលរបស់អ្នក។</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#6C63FF] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>ចុចលើតំណភ្ជាប់ (Link) ដើម្បីផ្ទៀងផ្ទាត់គណនី។</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#6C63FF] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span>បន្ទាប់ពីចុចរួច សូមចុចប៊ូតុង <strong>«ខ្ញុំបានផ្ទៀងផ្ទាត់រួចរាល់»</strong> ខាងក្រោម។</span>
              </div>
            </div>

            {/* Status alerts */}
            {verifyStatusMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{verifyStatusMsg}</span>
              </div>
            )}

            {verifyErrorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                {verifyErrorMsg}
              </div>
            )}

            {/* Primary Action: Check Verification */}
            <button
              type="button"
              onClick={handleCheckEmailVerified}
              disabled={isCheckingVerification}
              className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] active:scale-[0.98] text-white font-bold py-3 rounded-xl shadow-xs text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isCheckingVerification ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>កំពុងពិនិត្យការផ្ទៀងផ្ទាត់...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>ខ្ញុំបានផ្ទៀងផ្ទាត់រួចរាល់ (Check Verification)</span>
                </>
              )}
            </button>

            {/* Resend & Switch Account Controls */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-xs font-bold text-black font-bold hover:text-[#6C63FF] flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ចូលគណនីផ្សេង</span>
              </button>

              <button
                type="button"
                onClick={handleResendVerificationEmail}
                disabled={resendCountdown > 0 || isResendingEmail}
                className="text-xs font-bold text-[#6C63FF] hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isResendingEmail ? "animate-spin" : ""}`} />
                {resendCountdown > 0 ? (
                  <span>ផ្ញើអ៊ីមែលឡើងវិញ ({resendCountdown}s)</span>
                ) : (
                  <span>ផ្ញើអ៊ីមែលឡើងវិញ</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: Forgot Password Modal
          ======================================================== */}
      {modalMode === "forgot" && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-4 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalMode("email")}
              className="absolute top-4 right-4 text-[#111111] font-bold hover:text-black font-bold p-1.5 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <h3 className="font-bold text-lg text-[#6C63FF]">🔑 ភ្លេចពាក្យសម្ងាត់?</h3>
              <p className="text-xs font-bold text-black font-bold mt-1">
                បញ្ចូលអ៊ីមែលរបស់អ្នក ដើម្បីទទួលបានតំណកំណត់ពាក្យសម្ងាត់ថ្មី
              </p>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black font-bold mb-1">
                  អ៊ីមែល (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#111111] font-bold absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full bg-[#F5F7FA] border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-bold text-black focus:outline-none focus:border-[#6C63FF] focus:bg-white"
                    required
                  />
                </div>
              </div>

              {forgotMessage && <p className="text-emerald-600 text-xs font-bold">{forgotMessage}</p>}
              {forgotError && <p className="text-red-500 text-xs font-bold">{forgotError}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6C63FF] hover:bg-[#5a51e6] text-white font-bold py-2.5 rounded-xl shadow-xs text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{isLoading ? "⏳ កំពុងផ្ញើ..." : "📧 ផ្ញើតំណកំណត់ពាក្យសម្ងាត់"}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode("email")}
                  className="text-xs font-bold text-black font-bold hover:text-[#6C63FF] transition cursor-pointer"
                >
                  ← ត្រឡប់ទៅចូលប្រើ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: Privacy Policy Modal
          ======================================================== */}
      {modalMode === "privacy" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col border border-gray-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-black leading-tight">
                    គោលការណ៍ឯកជនភាព Hugi
                  </h3>
                  <p className="text-xs font-bold text-[#111111] font-bold">
                    (Hugi Privacy Policy)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalMode("none")}
                className="text-[#111111] font-bold hover:text-black font-bold p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="បិទ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 sm:p-4 overflow-y-auto space-y-4 text-xs font-bold text-black font-bold leading-relaxed">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-black">
                <p className="font-bold text-xs font-bold text-black">
                  គោលការណ៍ឯកជនភាព Hugi (Hugi Privacy Policy)<br />
                  <span className="text-black font-normal">(បច្ចុប្បន្នភាពចុងក្រោយ៖ ឆ្នាំ២០២៦)</span>
                </p>
              </div>

              {/* 1. Introduction */}
              <div className="space-y-1">
                <h4 className="font-bold text-black text-xs">
                  ១. សេចក្តីផ្តើម (Introduction)
                </h4>
                <p className="text-black font-bold">
                  Hugi ផ្តល់តម្លៃខ្ពស់បំផុតដល់សិទ្ធិឯកជនភាពរបស់អ្នក។ គោលការណ៍នេះពិពណ៌នាអំពីព័ត៌មានដែលយើងប្រមូល របៀបប្រើប្រាស់ និងវិធានការការពារព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក។
                </p>
              </div>

              {/* 2. Data Collection */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-black text-xs">
                  ២. ព័ត៌មានដែលយើងប្រមូល (Data Collection)
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-black font-bold">
                  <li>
                    <strong className="text-black">ព័ត៌មានគណនី (Account Data)៖</strong> ឈ្មោះ, អ៊ីមែល ឬលេខទូរស័ព្ទ, និងរូបថតប្រវត្តិរូប (Avatar)។
                  </li>
                  <li>
                    <strong className="text-black">ខ្លឹមសាររបស់អ្នក (User Content)៖</strong> រាល់អត្ថបទ រូបភាព ឬទិន្នន័យ Story ដែលអ្នកបង្ហោះ។
                  </li>
                  <li>
                    <strong className="text-black">សារឆាតផ្ទាល់ខ្លួន (Direct Messages)៖</strong> ការសន្ទនាផ្ទាល់ខ្លួនរបស់អ្នកជាមួយមិត្តភក្តិត្រូវបានការពារយ៉ាងម៉ត់ចត់។
                  </li>
                </ul>
              </div>

              {/* 3. Account & Chat Privacy */}
              <div className="space-y-2 bg-[#6C63FF]/5 p-3.5 rounded-2xl border border-[#6C63FF]/20">
                <h4 className="font-bold text-[#6C63FF] text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#6C63FF] shrink-0" />
                  ៣. ឯកជនភាពនៃគណនី និងសារឆាត (Account & Chat Privacy)
                </h4>
                <ul className="space-y-2 text-black text-xs font-bold">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-black">ភាពជាឯកជនជាចម្បង (Strictly Private)៖</strong> រាល់ខ្លឹមសារ និងព័ត៌មានក្នុងគណនីរបស់អ្នកត្រូវបានរក្សាជាឯកជនភាពដាច់ខាត។
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-black">គ្មានការបង្ហាញសាធារណៈ (No Unauthorized Public Display)៖</strong> យើងដាច់ខាតមិនបង្ហាញ ឬចែករំលែកទិន្នន័យរបស់អ្នកឡើយ។
                    </span>
                  </li>
                </ul>
              </div>

              {/* 4. How We Use Data */}
              <div className="space-y-1">
                <h4 className="font-bold text-black text-xs">
                  ៤. របៀបដែលយើងប្រើប្រាស់ព័ត៌មាន (How We Use Data)
                </h4>
                <p className="text-black font-bold">
                  គ្រប់គ្រងគណនី, រក្សាទុកទិន្នន័យមានសុវត្ថិភាព, កែលម្អប្រព័ន្ធ, និងផ្ញើការជូនដំណឹងសំខាន់ៗ។
                </p>
              </div>

              {/* 5. Contact Us */}
              <div className="space-y-1 pt-1 border-t border-gray-100">
                <h4 className="font-bold text-black text-xs">
                  ៥. ការទំនាក់ទំនង (Contact Us)
                </h4>
                <p className="text-black font-bold">
                  Email: <a href="mailto:support@hugi.com" className="text-[#6C63FF] hover:underline font-bold">support@hugi.com</a>
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setModalMode("none")}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#6C63FF] hover:bg-[#5a51e6] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
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
