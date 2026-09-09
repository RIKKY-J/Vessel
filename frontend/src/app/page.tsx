"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { RefreshCw, ArrowRight, Sparkles, Cpu, Terminal, Code2 } from "lucide-react";

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

  const handleStartCoding = async () => {
    if (!replId.trim()) {
      setErrorMessage("Please specify or generate a REPL ID");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await axios.post("/api/project", { replId: replId.trim(), language });
      router.push(`/coding?replId=${encodeURIComponent(replId.trim())}`);
    } catch (err: any) {
      console.error("Error creating project:", err);
      setErrorMessage(err?.response?.data?.error || "Failed to start workspace. Please check configuration.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#2e3035]">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.06)_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.05)_0%,_transparent_60%)] pointer-events-none" />

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Cloud IDE
          </div>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            Spin up isolated Kubernetes development sandboxes with real-time Monaco editor, bash terminal, and live preview.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1c1f24]/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          {/* REPL Identifier */}
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Workspace Identifier (Repl ID)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={replId}
                onChange={(e) => setReplId(e.target.value)}
                placeholder="e.g. swift-cyber-orbit"
                className="flex-1 bg-[#13151a] border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 transition outline-none"
              />
              <button
                type="button"
                onClick={() => setReplId(getRandomSlug())}
                title="Generate new ID"
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Environment / Language selection */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Runtime Template
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLanguage("node-js")}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition text-left ${
                  language === "node-js"
                    ? "bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500"
                    : "bg-[#13151a] border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Node.js</div>
                  <div className="text-xs text-slate-500">v20 Runtime</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLanguage("python")}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition text-left ${
                  language === "python"
                    ? "bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500"
                    : "bg-[#13151a] border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Python</div>
                  <div className="text-xs text-slate-500">v3 Runtime</div>
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
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Provisioning Sandbox...
              </>
            ) : (
              <>
                Launch Environment
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-3 gap-4 mt-8 text-center">
          <div className="p-3 rounded-xl bg-black/20 border border-slate-700/40">
            <Cpu className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <div className="text-xs font-medium text-slate-300">Isolated Pods</div>
            <div className="text-[10px] text-slate-500">Dedicated K8s Container</div>
          </div>
          <div className="p-3 rounded-xl bg-black/20 border border-slate-700/40">
            <Terminal className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <div className="text-xs font-medium text-slate-300">Live PTY Terminal</div>
            <div className="text-[10px] text-slate-500">Low-latency WebSockets</div>
          </div>
          <div className="p-3 rounded-xl bg-black/20 border border-slate-700/40">
            <Code2 className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <div className="text-xs font-medium text-slate-300">Monaco Engine</div>
            <div className="text-[10px] text-slate-500">VS Code editing experience</div>
          </div>
        </div>
      </div>
    </main>
  );
}
