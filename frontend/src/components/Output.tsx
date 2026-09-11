"use client";

import { useState } from "react";
import { RefreshCw, ExternalLink, Globe } from "lucide-react";

interface OutputProps {
  replId: string;
}

export default function Output({ replId }: OutputProps) {
  const [iframeKey, setIframeKey] = useState(0);
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

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={refreshIframe}
            title="Reload frame"
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#12544F]/50 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
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
            ✨ Secure In-IDE Preview active. Running on port 3000.
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

