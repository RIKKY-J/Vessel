"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Terminal,
  Code2,
  ExternalLink,
  Layers,
  Zap,
  Users,
  Send,
  CheckCircle2,
} from "lucide-react";

export default function HomeLandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("vessel_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleOpenWorkspace = () => {
    if (user) {
      router.push("/projects");
    } else {
      router.push("/signin");
    }
  };

  const featurePoints = [
    {
      num: "01",
      title: "Cloud-based Development Environment",
      desc: "A complete browser-native coding environment with Monaco editor, container filesystem, interactive terminal, and runtime—no local setup needed.",
    },
    {
      num: "02",
      title: "Instant Code Execution & Preview",
      desc: "Run your code immediately and get an in-IDE live preview of web applications with instant sandbox synchronization.",
    },
    {
      num: "03",
      title: "Built-in Terminal & Development Tools",
      desc: "Integrated terminal allows developers to install dependencies, execute bash commands, run background servers, and manage Git workflows.",
    },
    {
      num: "04",
      title: "Real-time Collaboration",
      desc: "Multiple developers can collaborate and code simultaneously in the cloud, making it ideal for team projects, education, and hackathons.",
    },
    {
      num: "05",
      title: "Easy Deployment & Sharing",
      desc: "Projects can be shared through a direct link and deployed without requiring developers to configure their own server infrastructure.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0B0D11] text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-[#232936] px-6 sm:px-12 flex items-center justify-between sticky top-0 bg-[#0B0D11]/95 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="w-8 h-8 rounded-lg bg-[#181C24] border border-[#232936] flex items-center justify-center font-mono text-xs text-[#E73F1E] font-bold group-hover:border-[#E73F1E] transition">
              &lt;/&gt;
            </span>
            <span className="font-semibold text-sm tracking-wide text-white font-mono">
              vessel.editor
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {user ? (
            <Link
              href="/projects"
              className="text-xs text-slate-300 hover:text-white transition font-mono"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/signin"
              className="text-xs text-slate-300 hover:text-white transition font-mono"
            >
              Sign in
            </Link>
          )}

          <button
            onClick={handleOpenWorkspace}
            className="h-9 px-4 rounded-xl bg-[#E73F1E] hover:bg-[#ff4d29] text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer border border-[#E73F1E]"
          >
            <span>Open workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 sm:px-12 pt-16 sm:pt-24 pb-20 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & CTA */}
          <div className="lg:col-span-6 flex flex-col items-start">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#181C24] border border-[#232936] text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E73F1E] animate-pulse" />
              <span>Browser-native development desk</span>
            </div>

            {/* Big Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-6">
              Make the <br />
              <span className="text-[#E73F1E]">next</span> <br />
              thing.
            </h1>

            {/* Subtitle */}
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-md mb-8">
              A compact coding workspace for learning in public, testing a thought, and shipping the small idea that has been waiting.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleOpenWorkspace}
                className="h-12 px-6 rounded-xl bg-[#E73F1E] hover:bg-[#ff4d29] text-white text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer border border-[#E73F1E]"
              >
                <span>Start building</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="h-12 px-4 rounded-xl bg-[#12151B] border border-[#232936] text-xs font-mono text-slate-400 flex items-center gap-2 select-none">
                <span className="bg-[#181C24] border border-[#232936] px-1.5 py-0.5 rounded text-[11px] text-slate-300">⌘</span>
                <span className="bg-[#181C24] border border-[#232936] px-1.5 py-0.5 rounded text-[11px] text-slate-300">K</span>
                <span>command palette</span>
              </div>
            </div>
          </div>

          {/* Right Column: Code Window Mockup */}
          <div className="lg:col-span-6 relative">
            <div className="w-full bg-[#12151B] border border-[#232936] rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
              {/* Window Header */}
              <div className="px-4 py-3 bg-[#181C24] border-b border-[#232936] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                </div>
                <div className="text-[11px] text-slate-400 tracking-wide">
                  main.ts &mdash; vessel.editor
                </div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  saved
                </div>
              </div>

              {/* Code Contents with Syntax Highlighting */}
              <div className="p-5 overflow-x-auto leading-relaxed text-slate-300 space-y-1 bg-[#0B0D11]">
                <div className="flex">
                  <span className="w-7 text-slate-600 select-none">1</span>
                  <span>
                    <span className="text-purple-400">import</span> &#123;{" "}
                    <span className="text-cyan-400">createApp</span> &#125;{" "}
                    <span className="text-purple-400">from</span>{" "}
                    <span className="text-emerald-300">&quot;./app&quot;</span>;
                  </span>
                </div>
                <div className="flex">
                  <span className="w-7 text-slate-600 select-none">2</span>
                  <span></span>
                </div>
                <div className="flex">
                  <span className="w-7 text-slate-600 select-none">3</span>
                  <span>
                    <span className="text-purple-400">const</span> app ={" "}
                    <span className="text-cyan-400">createApp</span>(&#123;
                  </span>
                </div>
                <div className="flex">
                  <span className="w-7 text-slate-600 select-none">4</span>
                  <span className="pl-4">
                    name: <span className="text-emerald-300">&quot;vessel-editor&quot;</span>,
                  </span>
                </div>
                <div className="flex">
                  <span className="w-7 text-slate-600 select-none">5</span>
                  <span className="pl-4">
                    port: <span className="text-amber-400">3000</span>,
                  </span>
                </div>
                <div className="flex">
                  <span className="w-7 text-slate-600 select-none">6</span>
                  <span>&#125;);</span>
                </div>
                <div className="flex">
                  <span className="w-7 text-slate-600 select-none">7</span>
                  <span></span>
                </div>
                <div className="flex">
                  <span className="w-7 text-slate-600 select-none">8</span>
                  <span>
                    app.<span className="text-blue-400">listen</span>(() =&gt; &#123;
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-7 text-slate-600 select-none">9</span>
                  <span className="pl-4">
                    console.<span className="text-blue-400">log</span>(
                    <span className="text-emerald-300">&quot;Ready.&quot;</span>);
                    <span className="inline-block w-2 h-4 bg-[#E73F1E] ml-1 align-middle animate-pulse" />
                  </span>
                </div>
                <div className="flex">
                  <span className="w-7 text-slate-600 select-none">10</span>
                  <span>&#125;);</span>
                </div>
              </div>

              {/* Window Footer Status Bar */}
              <div className="px-4 py-2 bg-[#12151B] border-t border-[#232936] flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span>Ln 9, Col 42</span>
                  <span>UTF-8</span>
                  <span>TypeScript</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 font-medium">localhost:3000</span>
                </div>
              </div>
            </div>

            {/* Floating Instant Preview Badge */}
            <div className="absolute -bottom-4 left-6 bg-[#181C24] border border-[#232936] text-slate-200 text-xs font-mono px-3 py-1.5 rounded-full shadow-xl flex items-center gap-2">
              <span className="text-emerald-400 font-bold">&#10003;</span>
              <span>instant preview</span>
            </div>
          </div>
        </div>
      </main>

      {/* Numbered Feature Cards Section (Screenshot 2) */}
      <section className="border-t border-[#232936] bg-[#0B0D11] py-16 px-6 sm:px-12">
        <div className="max-w-6xl w-full mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featurePoints.map((feat) => (
              <div
                key={feat.num}
                className="bg-[#12151B] border border-[#232936] hover:border-[#E73F1E]/50 rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-[#E73F1E] tracking-widest block mb-4">
                    {feat.num}
                  </span>
                  <h3 className="text-base font-bold text-white mb-2.5 group-hover:text-slate-100 transition">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}

            {/* Quick CTA Card */}
            <div
              onClick={handleOpenWorkspace}
              className="bg-[#181C24] border border-[#E73F1E]/40 hover:border-[#E73F1E] rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-md"
            >
              <div>
                <span className="font-mono text-xs font-bold text-[#E73F1E] tracking-widest block mb-4">
                  06
                </span>
                <h3 className="text-base font-bold text-white mb-2.5">
                  Ready to code?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Start building now with zero installation. Run Node.js and Python projects in your browser.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#232936] flex items-center justify-between text-xs font-bold text-[#E73F1E]">
                <span>Launch workspace</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#232936] py-8 px-6 sm:px-12 bg-[#0B0D11]">
        <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div>
            vessel.editor / 2026
          </div>
          <div>
            Made for the next commit.
          </div>
        </div>
      </footer>
    </div>
  );
}
