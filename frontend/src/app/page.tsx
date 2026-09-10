"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { RefreshCw, ArrowRight, Sparkles, Cpu, Terminal, Code2, FolderGit2, CheckCircle2 } from "lucide-react";

const SLUG_WORDS = [
  "swift", "cosmic", "cyber", "pixel", "quantum", "turbo", "hyper",
  "cloud", "runner", "orbit", "prism", "shadow", "neon", "flux",
  "python", "node", "nexus", "echo", "vertex", "pulse"
];

function getRandomSlug() {
  let parts = [];
  for (let i = 0; i < 3; i++) {
    parts.push(SLUG_WORDS[Math.floor(Math.random() * SLUG_WORDS.length)]);
  }
  return parts.join("-");
}

export default function LandingPage() {
  const router = useRouter();
  const [language, setLanguage] = useState("node-js");
  const [replId, setReplId] = useState(() => getRandomSlug());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExisting, setIsExisting] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Check if replId already exists in S3
  useEffect(() => {
    const trimmed = replId.trim();
    if (!trimmed) {
      setIsExisting(false);
      return;
    }

    const timer = setTimeout(() => {
      setCheckingExisting(true);
      axios
        .get(`/api/project/check?replId=${encodeURIComponent(trimmed)}`)
        .then((res) => {
          if (res.data?.exists) {
            setIsExisting(true);
            if (res.data.language) {
              setLanguage(res.data.language);
            }
          } else {
            setIsExisting(false);
          }
        })
        .catch(() => {
          setIsExisting(false);
        })
        .finally(() => {
          setCheckingExisting(false);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [replId]);

  const handleStartCoding = async () => {
    if (!replId.trim()) {
      setErrorMessage("Please specify or generate a REPL ID");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await axios.post("/api/project", { replId: replId.trim(), language });
      const finalLang = res.data?.language || language;
      router.push(`/coding?replId=${encodeURIComponent(replId.trim())}&lang=${encodeURIComponent(finalLang)}`);
    } catch (err: any) {
      console.error("Error creating project:", err);
      setErrorMessage(err?.response?.data?.error || "Failed to start workspace. Please check configuration.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#092328]">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(42,131,95,0.2)_0%,_transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(139,187,146,0.12)_0%,_transparent_65%)] pointer-events-none" />

      <div className="w-full max-w-xl z-10">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Logo + App Name */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <img src="/logo.png" alt="Vessel Logo" className="w-12 h-12 object-contain drop-shadow-lg" />
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              Vessel
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#12544F]/50 border border-[#2A835F]/50 text-[#8BBB92] text-xs font-medium mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#8BBB92]" /> Cloud IDE
          </div>
          <p className="text-slate-300 text-sm sm:text-base max-w-md mx-auto">
            Spin up isolated Kubernetes development sandboxes with real-time Monaco editor, bash terminal, and live preview.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#12544F]/25 backdrop-blur-xl border border-[#12544F] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60">
          {/* REPL Identifier */}
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8BBB92] mb-2">
              Workspace Identifier (Repl ID)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={replId}
                onChange={(e) => setReplId(e.target.value)}
                placeholder="e.g. swift-cyber-orbit"
                className="flex-1 bg-[#092328] border border-[#12544F] focus:border-[#2A835F] focus:ring-1 focus:ring-[#2A835F] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 transition outline-none"
              />
              <button
                type="button"
                onClick={() => setReplId(getRandomSlug())}
                title="Generate new ID"
                className="px-3 py-2.5 bg-[#12544F]/40 hover:bg-[#12544F] text-[#8BBB92] hover:text-white rounded-xl border border-[#12544F] transition flex items-center justify-center cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {isExisting && (
              <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A835F]/20 border border-[#2A835F]/40 text-[#8BBB92] text-xs font-medium">
                <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
                <span>Existing project found in S3 — your saved workspace files will be restored.</span>
              </div>
            )}
          </div>

          {/* Environment / Language selection */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8BBB92] mb-2">
              Runtime Template
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLanguage("node-js")}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition text-left cursor-pointer ${
                  language === "node-js"
                    ? "bg-[#2A835F]/25 border-[#2A835F] text-white ring-1 ring-[#2A835F]"
                    : "bg-[#092328]/80 border-[#12544F] text-slate-300 hover:border-[#2A835F]/60"
                }`}
              >
                <div className="p-2 rounded-lg bg-[#2A835F]/25 text-[#8BBB92]">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Node.js</div>
                  <div className="text-xs text-slate-400">v20 Runtime</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLanguage("python")}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition text-left cursor-pointer ${
                  language === "python"
                    ? "bg-[#2A835F]/25 border-[#2A835F] text-white ring-1 ring-[#2A835F]"
                    : "bg-[#092328]/80 border-[#12544F] text-slate-300 hover:border-[#2A835F]/60"
                }`}
              >
                <div className="p-2 rounded-lg bg-[#12544F]/50 text-[#8BBB92]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Python</div>
                  <div className="text-xs text-slate-400">v3 Runtime</div>
                </div>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Launch button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleStartCoding}
            className="w-full py-3 px-5 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#2A835F]/20 bg-gradient-to-r from-[#2A835F] to-[#12544F] hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {isExisting ? "Resuming Workspace..." : "Provisioning Sandbox..."}
              </>
            ) : isExisting ? (
              <>
                Resume Saved Project
                <ArrowRight className="w-4 h-4 text-[#8BBB92]" />
              </>
            ) : (
              <>
                Launch Environment
                <ArrowRight className="w-4 h-4 text-[#8BBB92]" />
              </>
            )}
          </button>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-3 gap-4 mt-8 text-center">
          <div className="p-3 rounded-xl bg-[#12544F]/20 border border-[#12544F]/60">
            <Cpu className="w-4 h-4 text-[#8BBB92] mx-auto mb-1" />
            <div className="text-xs font-medium text-slate-200">Isolated Pods</div>
            <div className="text-[10px] text-slate-400">Dedicated K8s Container</div>
          </div>
          <div className="p-3 rounded-xl bg-[#12544F]/20 border border-[#12544F]/60">
            <Terminal className="w-4 h-4 text-[#8BBB92] mx-auto mb-1" />
            <div className="text-xs font-medium text-slate-200">Live PTY Terminal</div>
            <div className="text-[10px] text-slate-400">Low-latency WebSockets</div>
          </div>
          <div className="p-3 rounded-xl bg-[#12544F]/20 border border-[#12544F]/60">
            <Code2 className="w-4 h-4 text-[#8BBB92] mx-auto mb-1" />
            <div className="text-xs font-medium text-slate-200">Monaco Engine</div>
            <div className="text-[10px] text-slate-400">VS Code editing experience</div>
          </div>
        </div>
      </div>
    </main>
  );
}
