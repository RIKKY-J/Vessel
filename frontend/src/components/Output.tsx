"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, ExternalLink, Globe, Zap } from "lucide-react";

interface OutputProps {
  replId: string;
}

export default function Output({ replId }: OutputProps) {
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
    <div className="flex flex-col h-full bg-[#092328] border-b border-[#12544F]">
      {/* Browser Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12544F]/20 border-b border-[#12544F] text-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 mr-3 min-w-0">
          <Globe className="w-3.5 h-3.5 text-[#8BBB92] shrink-0" />
          <div className="flex-1 bg-[#092328] border border-[#12544F] rounded px-2.5 py-1 text-[#8BBB92] text-xs font-mono truncate" title={directHttpUri}>
            {directHttpUri}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Live Sync Status */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#12544F]/30 border border-[#12544F]/60 text-[11px]">
            <Zap className={`w-3 h-3 ${isAutoReloading ? "text-amber-400 animate-bounce" : "text-[#8BBB92]"}`} />
            <span className={isAutoReloading ? "text-amber-300 font-medium" : "text-[#8BBB92]"}>
              {isAutoReloading ? "Reloading..." : "Live Preview"}
            </span>
          </div>

          <button
            onClick={refreshIframe}
            title="Reload frame"
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#12544F]/50 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoReloading ? "animate-spin text-amber-300" : ""}`} />
          </button>
          <a
            href={directHttpUri}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab (standalone preview)"
            className="px-2 py-1 rounded bg-[#12544F]/50 hover:bg-[#2A835F] text-[#8BBB92] hover:text-white transition text-[11px] font-medium flex items-center gap-1 border border-[#12544F] cursor-pointer"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* HTTPS Embedded Preview Notice */}
      {isHttps && (
        <div className="bg-[#12544F]/25 border-b border-[#12544F] px-3 py-1 flex items-center justify-between text-[10px] text-[#8BBB92]/80 shrink-0">
          <span className="truncate">
            ✨ Secure In-IDE Preview active. Connected to port 3000.
          </span>
          <a
            href={directHttpUri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-[#8BBB92] underline shrink-0 ml-2 font-medium"
          >
            Open Standalone Tab ↗
          </a>
        </div>
      )}

      {/* Iframe View */}
      <div className="flex-1 bg-[#092328] relative">
        <iframe
          key={iframeKey}
          src={iframeSrc}
          className="w-full h-full border-none"
          title="App Output Preview"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
