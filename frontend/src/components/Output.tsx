"use client";

import { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  ExternalLink,
  Globe,
  Play,
  Settings,
  X,
  RotateCcw,
  Sliders,
  Check,
} from "lucide-react";

interface OutputProps {
  replId: string;
  onRun?: (cmd?: string) => void;
  isRunning?: boolean;
  language?: string;
  runCommand?: string;
  onCommandChange?: (cmd: string) => void;
}

export default function Output({
  replId,
  onRun,
  isRunning,
  language = "node-js",
  runCommand,
  onCommandChange,
}: OutputProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isAutoReloading, setIsAutoReloading] = useState(false);
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Settings popover state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const defaultCommand = language === "python" ? "python3 main.py" : "node --watch index.js";
  const effectiveCommand = runCommand || defaultCommand;
  const [commandInput, setCommandInput] = useState(effectiveCommand);
  const [justSaved, setJustSaved] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  // Sync command input when prop changes or popover opens
  useEffect(() => {
    setCommandInput(effectiveCommand);
  }, [effectiveCommand, isSettingsOpen]);

  // Dismiss settings on click outside
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  const presets =
    language === "python"
      ? ["python3 main.py", "python main.py", "python3 app.py", "flask run -p 3000"]
      : ["node --watch index.js", "npm start", "npm run dev", "node index.js"];

  const handleSaveCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalCmd = commandInput.trim() || defaultCommand;
    setCommandInput(finalCmd);
    if (onCommandChange) {
      onCommandChange(finalCmd);
    }
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
      setIsSettingsOpen(false);
    }, 400);
  };

  const handleResetToDefault = () => {
    setCommandInput(defaultCommand);
    if (onCommandChange) {
      onCommandChange(defaultCommand);
    }
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
      setIsSettingsOpen(false);
    }, 400);
  };

  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  
  // Choose HTTPS port 31754 if on HTTPS, or HTTP port 31516
  const clusterHost = isHttps
    ? (process.env.NEXT_PUBLIC_CLUSTER_HTTPS_HOST || "100.57.92.214.nip.io:31754")
    : (process.env.NEXT_PUBLIC_CLUSTER_HOST || "100.57.92.214.nip.io:31516");

  const protocol = isHttps ? "https:" : "http:";
  const instanceUri = `${protocol}//${replId}-app.${clusterHost}`;
  const directHttpUri = `http://${replId}-app.${process.env.NEXT_PUBLIC_CLUSTER_HOST || "100.57.92.214.nip.io:31516"}`;
  const iframeSrc = isHttps ? `/api/preview/${encodeURIComponent(replId)}/` : instanceUri;

  const refreshIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  // Real-time auto-reload listener on file update
  useEffect(() => {
    const handleFileUpdated = (event: any) => {
      const updatedReplId = event?.detail?.replId;
      if (updatedReplId && updatedReplId !== replId) return;

      setIsAutoReloading(true);
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }

      // Wait 600ms for node/server to restart or file to be flushed
      reloadTimerRef.current = setTimeout(() => {
        setIframeKey((prev) => prev + 1);
        setIsAutoReloading(false);
      }, 600);
    };

    window.addEventListener("vessel:file-updated", handleFileUpdated);

    return () => {
      window.removeEventListener("vessel:file-updated", handleFileUpdated);
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }
    };
  }, [replId]);

  return (
    <div className="flex flex-col h-full bg-[#0B0D11] border-b border-[#232936]">
      {/* Clean Browser Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12151B] border-b border-[#232936] text-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 mr-3 min-w-0">
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="flex-1 bg-[#0B0D11] border border-[#232936] rounded px-2.5 py-1 text-slate-300 text-xs font-mono truncate" title={directHttpUri}>
            {directHttpUri}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRun && (
            <div className="relative inline-flex items-center" ref={settingsRef}>
              <div className="inline-flex rounded overflow-hidden border border-[#E73F1E] shadow-sm">
                {/* Main Run Button */}
                <button
                  onClick={() => onRun(effectiveCommand)}
                  disabled={isRunning}
                  title={`Run: ${effectiveCommand} (Ctrl + Enter)`}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#E73F1E] hover:bg-[#ff4d29] text-white transition text-[11px] font-bold cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isRunning ? "Running..." : "Run"}</span>
                </button>

                {/* Very small settings option */}
                <button
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  title="Configure Run command"
                  className={`px-1.5 py-1 bg-[#E73F1E] hover:bg-[#ff4d29] text-white transition border-l border-white/25 cursor-pointer flex items-center justify-center ${
                    isSettingsOpen ? "bg-[#c02e11]" : ""
                  }`}
                >
                  <Settings className="w-3 h-3" />
                </button>
              </div>

              {/* Small Run Command Settings Popover */}
              {isSettingsOpen && (
                <div className="absolute top-full right-0 mt-1.5 w-72 sm:w-80 bg-[#12151B] border border-[#232936] rounded-xl shadow-2xl p-3 z-50 text-white select-none animate-in fade-in zoom-in-95 duration-100">
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#232936]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Sliders className="w-3.5 h-3.5 text-[#E73F1E]" />
                      <span>Run Command Setting</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#181C24] transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSaveCommand} className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-slate-300">
                          Command to execute
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {language === "python" ? "Python" : "Node.js"}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={commandInput}
                        onChange={(e) => setCommandInput(e.target.value)}
                        placeholder={defaultCommand}
                        className="w-full h-8 bg-[#0B0D11] border border-[#232936] focus:border-[#E73F1E] rounded-lg px-2.5 text-xs text-white font-mono focus:outline-none placeholder-slate-600 transition"
                        autoFocus
                      />
                    </div>

                    {/* Presets */}
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-1 font-mono">
                        Quick presets:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {presets.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setCommandInput(p)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer ${
                              commandInput === p
                                ? "bg-[#E73F1E]/20 border-[#E73F1E] text-[#ff6747]"
                                : "bg-[#181C24] border-[#232936] text-slate-300 hover:text-white hover:border-slate-500"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-tight">
                      Runs inside the container on port 3000 to update the live preview.
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#232936]">
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>

                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg bg-[#E73F1E] hover:bg-[#ff4d29] text-white text-[11px] font-bold transition border border-[#E73F1E] shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        {justSaved ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Saved!</span>
                          </>
                        ) : (
                          <span>Save</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          <button
            onClick={refreshIframe}
            title="Reload preview"
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#181C24] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoReloading ? "animate-spin text-[#E73F1E]" : ""}`} />
          </button>
          <a
            href={directHttpUri}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab (standalone preview)"
            className="px-2 py-1 rounded bg-[#181C24] hover:bg-[#232936] text-white transition text-[11px] font-medium flex items-center gap-1 border border-[#232936] cursor-pointer"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Pure White Browser Preview Canvas - Pristine Visibility */}
      <div className="flex-1 bg-white relative w-full h-full overflow-hidden">
        <iframe
          key={iframeKey}
          src={iframeSrc}
          className="w-full h-full border-none bg-white"
          style={{ backgroundColor: "#ffffff" }}
          title="App Output Preview"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
