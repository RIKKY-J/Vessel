"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Terminal,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "signup") {
        const res = await axios.post("/api/auth/signup", {
          email: cleanEmail,
          password,
          name: name.trim() || cleanEmail.split("@")[0],
        });

        const { user, expiresAt } = res.data;
        localStorage.setItem(
          "vessel_user",
          JSON.stringify({
            ...user,
            expiresAt,
            signedInAt: Date.now(),
          })
        );

        setSuccessMessage("Account created! Redirecting to your workspaces...");
        setTimeout(() => {
          router.push("/projects");
        }, 600);
      } else {
        const res = await axios.post("/api/auth/login", {
          email: cleanEmail,
          password,
        });

        const { user, expiresAt } = res.data;
        localStorage.setItem(
          "vessel_user",
          JSON.stringify({
            ...user,
            expiresAt,
            signedInAt: Date.now(),
          })
        );

        setSuccessMessage("Authenticated! Redirecting to workspaces...");
        setTimeout(() => {
          router.push("/projects");
        }, 500);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMessage(
        err?.response?.data?.error || "Authentication failed. Please check your credentials."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0D11] text-white flex flex-col justify-between p-6 select-none font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition text-xs font-mono group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to vessel.editor</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#E73F1E]" />
          <span>12-Hour Session Auth</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-md bg-[#12151B] border border-[#232936] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#E73F1E]" />

          {/* Logo & Headings */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-[#181C24] border border-[#232936] px-3 py-1.5 rounded-lg mb-4">
              <span className="font-mono text-xs text-[#E73F1E] font-bold">&lt;/&gt;</span>
              <span className="font-semibold text-sm tracking-wide text-white">vessel.editor</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">
              {mode === "login" ? "Sign in to your desk" : "Create your account"}
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              {mode === "login"
                ? "Enter your email and password to access your cloud workspaces."
                : "Register with email to get private isolated workspace storage in S3."}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-[#0B0D11] p-1 rounded-xl border border-[#232936] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                mode === "login"
                  ? "bg-[#E73F1E] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                mode === "signup"
                  ? "bg-[#E73F1E] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rikky"
                    className="w-full h-11 bg-[#181C24] border border-[#232936] focus:border-[#E73F1E] rounded-xl pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-11 bg-[#181C24] border border-[#232936] focus:border-[#E73F1E] rounded-xl pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none font-mono transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 bg-[#181C24] border border-[#232936] focus:border-[#E73F1E] rounded-xl pl-9 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none font-mono transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 bg-[#181C24] border border-[#232936] focus:border-[#E73F1E] rounded-xl pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none font-mono transition"
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#E73F1E] hover:bg-[#ff4d29] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 border border-[#E73F1E]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {mode === "login" ? "Verifying credentials..." : "Creating account..."}
                  </span>
                </>
              ) : (
                <span>{mode === "login" ? "Sign In →" : "Create Account →"}</span>
              )}
            </button>
          </form>

          {/* Toggle Login / Signup */}
          <div className="mt-5 text-center">
            {mode === "login" ? (
              <p className="text-xs text-slate-400">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="text-[#E73F1E] hover:underline font-semibold cursor-pointer"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="text-[#E73F1E] hover:underline font-semibold cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>

          {/* Feature Badge List */}
          <div className="mt-8 pt-6 border-t border-[#232936] space-y-2.5 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E73F1E]" />
              <span>Isolated S3 storage per user account</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#E73F1E]" />
              <span>Automatic 12-hour session timeout security</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-600 font-mono">
        vessel.editor / 2026 &bull; Made for the next commit.
      </footer>
    </div>
  );
}
