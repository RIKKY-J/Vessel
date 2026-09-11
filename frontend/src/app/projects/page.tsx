"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  Plus,
  Search,
  FolderGit2,
  ArrowRight,
  LogOut,
  Loader2,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Code2,
  Terminal,
} from "lucide-react";

interface S3Project {
  id: string;
  name: string;
  language: string;
}

const ADJECTIVES = ["neon", "hyper", "turbo", "cosmic", "flux", "orbit", "vertex", "swift", "pulse", "cyber"];
const NOUNS = ["runner", "node", "python", "cloud", "prism", "shadow", "spark", "forge", "pilot", "core"];

function generateReplId(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const mid = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${mid}-${noun}`;
}

export default function ProjectsPage() {
  const router = useRouter();

  const [user, setUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);
  const [projects, setProjects] = useState<S3Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create project form state
  const [newProjectName, setNewProjectName] = useState(generateReplId());
  const [selectedLanguage, setSelectedLanguage] = useState<"node-js" | "python">("node-js");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    // Check user authentication
    try {
      const stored = localStorage.getItem("vessel_user");
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        // Provide default guest profile if not logged in
        setUser({
          name: "Developer",
          email: "developer@vessel.cloud",
        });
      }
    } catch {
      setUser({ name: "Developer", email: "developer@vessel.cloud" });
    }

    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await axios.get("/api/project");
      setProjects(res.data?.projects || []);
    } catch (err) {
      console.warn("Error fetching projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const replId = newProjectName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    if (!replId) {
      setCreateError("Please enter a valid project name.");
      return;
    }

    setCreateError("");
    setIsCreating(true);

    try {
      await axios.post("/api/project", {
        replId,
        language: selectedLanguage,
      });

      router.push(`/coding?replId=${encodeURIComponent(replId)}&lang=${selectedLanguage}`);
    } catch (err: any) {
      console.error("Create project error:", err);
      setCreateError(err?.response?.data?.error || "Failed to initialize project.");
      setIsCreating(false);
    }
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem("vessel_user");
    } catch (e) {}
    router.push("/");
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-[#0B0D11] text-white flex flex-col font-sans select-none">
      {/* Navigation Header */}
      <header className="h-14 bg-[#12151B] border-b border-[#232936] px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-mono text-sm text-[#E73F1E] font-bold">&lt;/&gt;</span>
            <span className="font-semibold text-sm tracking-wide text-white group-hover:text-slate-200 transition">
              vessel.editor
            </span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-medium text-slate-300 bg-[#181C24] border border-[#232936] px-2.5 py-0.5 rounded-md">
            Workspaces
          </span>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#181C24] border border-[#232936] text-xs">
              <div className="w-5 h-5 rounded-full bg-[#E73F1E] text-white flex items-center justify-center font-bold text-[10px]">
                {user.name ? user.name[0].toUpperCase() : "G"}
              </div>
              <span className="font-medium text-slate-200 hidden sm:inline">{user.name}</span>
            </div>
          )}

          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181C24] border border-transparent hover:border-[#232936] transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Creator Section */}
        <section className="bg-[#12151B] border border-[#232936] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E73F1E]" />
                Create New Project
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Spin up an isolated Kubernetes container pod and launch Monaco IDE.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateProject} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project Name
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. swift-orbit-runner"
                  className="w-full h-10 bg-[#181C24] border border-[#232936] focus:border-[#E73F1E] rounded-xl px-3 font-mono text-xs text-white placeholder-slate-500 focus:outline-none transition pr-20"
                />
                <button
                  type="button"
                  onClick={() => setNewProjectName(generateReplId())}
                  className="absolute right-2 px-2 py-1 text-[10px] font-mono rounded bg-[#232936] hover:bg-[#2e3748] text-slate-300 transition cursor-pointer"
                  title="Generate random name"
                >
                  Roll 🎲
                </button>
              </div>
            </div>

            {/* Template Selector */}
            <div className="w-full md:w-auto">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Runtime
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLanguage("node-js")}
                  className={`h-10 px-4 rounded-xl text-xs font-semibold transition border flex items-center gap-2 cursor-pointer ${
                    selectedLanguage === "node-js"
                      ? "bg-[#181C24] border-[#E73F1E] text-white shadow-sm"
                      : "bg-[#181C24] border-[#232936] text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Node.js</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLanguage("python")}
                  className={`h-10 px-4 rounded-xl text-xs font-semibold transition border flex items-center gap-2 cursor-pointer ${
                    selectedLanguage === "python"
                      ? "bg-[#181C24] border-[#E73F1E] text-white shadow-sm"
                      : "bg-[#181C24] border-[#232936] text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Python</span>
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isCreating}
              className="w-full md:w-auto h-10 px-6 bg-[#E73F1E] hover:bg-[#ff4d29] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 border border-[#E73F1E]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Booting Pod...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </form>

          {createError && (
            <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
              {createError}
            </p>
          )}
        </section>

        {/* Existing Projects List */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#E73F1E]" />
                Your Workspaces
                <span className="text-xs text-slate-400 font-mono font-normal">
                  ({filteredProjects.length})
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                All projects synced to your persistent AWS S3 storage. Click any workspace to resume.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full h-9 bg-[#12151B] border border-[#232936] focus:border-[#E73F1E] rounded-xl pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                />
              </div>

              <button
                onClick={fetchProjects}
                disabled={loadingProjects}
                title="Refresh project list"
                className="h-9 w-9 bg-[#12151B] border border-[#232936] hover:bg-[#181C24] text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingProjects ? "animate-spin text-[#E73F1E]" : ""}`} />
              </button>
            </div>
          </div>

          {/* Grid of Workspaces */}
          {loadingProjects ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#E73F1E]" />
              <p className="text-xs font-mono">Loading workspaces from S3...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-[#12151B] border border-[#232936] rounded-2xl py-16 text-center px-4">
              <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">No workspaces found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                {searchQuery
                  ? `No workspaces match "${searchQuery}".`
                  : "You don't have any workspaces yet. Create your first project above to get started."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#E73F1E] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((proj) => {
                const isPy = proj.language === "python";
                return (
                  <div
                    key={proj.id}
                    onClick={() => router.push(`/coding?replId=${encodeURIComponent(proj.id)}&lang=${proj.language}`)}
                    className="bg-[#12151B] hover:bg-[#181C24] border border-[#232936] hover:border-[#E73F1E]/60 rounded-xl p-4 transition-all duration-150 flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-white group-hover:text-[#E73F1E] transition truncate">
                          {proj.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                            isPy
                              ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {isPy ? "Python" : "Node.js"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        s3://code/{proj.id}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#232936] flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Persistent S3
                      </span>
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white flex items-center gap-1 transition">
                        <span>Launch</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 text-[#E73F1E]" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[#232936] text-center text-xs text-slate-600 font-mono">
        vessel.editor / 2026 &bull; Made for the next commit.
      </footer>
    </div>
  );
}
