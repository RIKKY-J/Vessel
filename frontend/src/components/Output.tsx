"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, ExternalLink, Globe, Zap, Play } from "lucide-react";

interface OutputProps {
  replId: string;
  onRun?: () => void;
  isRunning?: boolean;
}

export default function Output({ replId, onRun, isRunning }: OutputProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isAutoReloading, setIsAutoReloading] = useState(false);
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);

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
            <button
              onClick={onRun}
              disabled={isRunning}
              title="Run & update preview (Ctrl + Enter)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E73F1E] hover:bg-[#ff4d29] text-white transition text-[11px] font-bold border border-[#E73F1E] shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isRunning ? "Running..." : "Run"}</span>
            </button>
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
