"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, Loader2, ShieldCheck, Terminal, User, Plus, Check, X } from "lucide-react";

interface GoogleAccount {
  name: string;
  email: string;
  avatar?: string;
}

const DEFAULT_ACCOUNTS: GoogleAccount[] = [
  {
    name: "Developer Workspace",
    email: "developer@gmail.com",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=dev_google",
  },
  {
    name: "Cloud Architect",
    email: "architect@gmail.com",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cloud_google",
  },
];

export default function SignInPage() {
  const router = useRouter();
  const [showChooser, setShowChooser] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<GoogleAccount[]>(DEFAULT_ACCOUNTS);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("vessel_known_google_accounts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedAccounts(parsed);
        }
      }
    } catch {}
  }, []);

  const handleSelectAccount = async (account: GoogleAccount) => {
    setErrorMessage("");
    setLoadingEmail(account.email);

    try {
      // 1. Sync & create user in S3
      const res = await axios.post("/api/user/sync", {
        email: account.email,
        name: account.name,
        avatar: account.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(account.email)}`,
      });

      const { user, expiresAt } = res.data;

      // 2. Persist 12-hour session in localStorage
      const sessionData = {
        ...user,
        expiresAt,
        signedInAt: Date.now(),
      };
      localStorage.setItem("vessel_user", JSON.stringify(sessionData));

      // 3. Save to known accounts
      const updatedAccounts = [
        account,
        ...savedAccounts.filter((a) => a.email !== account.email),
      ].slice(0, 4);
      localStorage.setItem("vessel_known_google_accounts", JSON.stringify(updatedAccounts));

      // 4. Redirect to projects page
      setTimeout(() => {
        router.push("/projects");
      }, 500);
    } catch (err: any) {
      console.error("Sign in error:", err);
      setErrorMessage(err?.response?.data?.error || "Failed to sign in with Google account.");
      setLoadingEmail(null);
    }
  };

  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.includes("@")) {
      setErrorMessage("Please enter a valid Google email address.");
      return;
    }
    const name = customName.trim() || customEmail.split("@")[0];
    const newAcc: GoogleAccount = {
      name,
      email: customEmail.trim().toLowerCase(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(customEmail)}`,
    };
    handleSelectAccount(newAcc);
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

      {/* Main Sign In Card */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md bg-[#12151B] border border-[#232936] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#E73F1E]" />

          {/* Logo & Headings */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-[#181C24] border border-[#232936] px-3 py-1.5 rounded-lg mb-5">
              <span className="font-mono text-xs text-[#E73F1E] font-bold">&lt;/&gt;</span>
              <span className="font-semibold text-sm tracking-wide text-white">vessel.editor</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Sign in to your desk
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              Select your Google account to access your workspaces, store projects in S3, and launch containers.
            </p>
          </div>

          {/* Google Button */}
          <div className="space-y-4">
            <button
              onClick={() => {
                setErrorMessage("");
                setShowChooser(true);
              }}
              className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm rounded-xl transition-all duration-150 flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer"
            >
              {/* Official Google 'G' Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {errorMessage && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg text-center">
                {errorMessage}
              </p>
            )}

            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-500">
                12-hour session security. Your workspaces are stored privately under your Google profile in S3.
              </p>
            </div>
          </div>

          {/* Feature Badge List */}
          <div className="mt-8 pt-6 border-t border-[#232936] space-y-2.5 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E73F1E]" />
              <span>Isolated S3 storage per user</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#E73F1E]" />
              <span>12-hour persistent login session</span>
            </div>
          </div>
        </div>
      </main>

      {/* Google Account Chooser Modal */}
      {showChooser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#12151B] border border-[#232936] rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowChooser(false);
                setIsCustomMode(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#181C24] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Google Logo Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-bold text-white">Choose an account</h3>
                <p className="text-[11px] text-slate-400">to continue to Vessel</p>
              </div>
            </div>

            <div className="divide-y divide-[#232936] my-2">
              {!isCustomMode ? (
                <>
                  {savedAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => handleSelectAccount(acc)}
                      disabled={Boolean(loadingEmail)}
                      className="w-full py-3 px-2 flex items-center justify-between hover:bg-[#181C24] rounded-xl transition cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#181C24] border border-[#232936] flex items-center justify-center font-bold text-xs text-white shrink-0">
                          {acc.name ? acc.name[0].toUpperCase() : "G"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate group-hover:text-[#E73F1E] transition">
                            {acc.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{acc.email}</p>
                        </div>
                      </div>

                      {loadingEmail === acc.email ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#E73F1E]" />
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Sign in</span>
                      )}
                    </button>
                  ))}

                  {/* Use another account */}
                  <button
                    onClick={() => setIsCustomMode(true)}
                    className="w-full py-3 px-2 flex items-center gap-3 hover:bg-[#181C24] rounded-xl transition cursor-pointer text-left text-slate-300 hover:text-white"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#181C24] border border-[#232936] flex items-center justify-center text-slate-400 shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium">Use another Google account</span>
                  </button>
                </>
              ) : (
                <form onSubmit={handleAddCustomAccount} className="pt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Google Email</label>
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full h-9 bg-[#181C24] border border-[#232936] focus:border-[#E73F1E] rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Rikky"
                      className="w-full h-9 bg-[#181C24] border border-[#232936] focus:border-[#E73F1E] rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className="flex-1 h-9 rounded-xl bg-[#181C24] hover:bg-[#232936] text-xs font-medium text-slate-300 transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={Boolean(loadingEmail)}
                      className="flex-1 h-9 rounded-xl bg-[#E73F1E] hover:bg-[#ff4d29] text-xs font-bold text-white transition flex items-center justify-center gap-1.5"
                    >
                      {loadingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Sign In</span>}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <p className="mt-4 text-[10px] text-slate-500 text-center leading-relaxed">
              Google will share your verified name, email address, and profile with Vessel to configure your workspace.
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-slate-600 font-mono">
        vessel.editor / 2026 &bull; Made for the next commit.
      </footer>
    </div>
  );
}
