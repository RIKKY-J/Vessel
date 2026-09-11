"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, Terminal } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsLoading(true);

    // Persist authenticated Google user session
    const mockGoogleUser = {
      name: "Google Developer",
      email: "developer@gmail.com",
      provider: "google",
      avatar: "https://lh3.googleusercontent.com/a/default-user=s96-c",
      signedInAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("vessel_user", JSON.stringify(mockGoogleUser));
    } catch (e) {
      console.warn("Storage error:", e);
    }

    setTimeout(() => {
      router.push("/projects");
    }, 600);
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
          <span>v2.4 live</span>
        </div>
      </header>

      {/* Main Sign In Card */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md bg-[#12151B] border border-[#232936] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle top accent bar */}
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
              Open your browser-native cloud workspaces, run code instantly, and deploy to Kubernetes.
            </p>
          </div>

          {/* Google Signup Only */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm rounded-xl transition-all duration-150 flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer disabled:opacity-75"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
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
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-500">
                Single sign-on via Google OAuth. Zero password configuration.
              </p>
            </div>
          </div>

          {/* Feature Badge List */}
          <div className="mt-8 pt-6 border-t border-[#232936] space-y-2.5 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E73F1E]" />
              <span>Dedicated isolated runner container per workspace</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#E73F1E]" />
              <span>Full root bash shell and native port forwarding</span>
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
