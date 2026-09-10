"use client";

import { useState } from "react";
import { RefreshCw, ExternalLink, Globe } from "lucide-react";

interface OutputProps {
  replId: string;
}

export default function Output({ replId }: OutputProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const clusterHost = process.env.NEXT_PUBLIC_CLUSTER_HOST || "52.90.6.151.nip.io:31516";
  const instanceUri = `http://${replId}-app.${clusterHost}`;

  const refreshIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col h-full bg-[#092328] border-b border-[#12544F]">
      {/* Browser Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12544F]/20 border-b border-[#12544F] text-xs">
        <div className="flex items-center gap-2 flex-1 mr-3">
          <Globe className="w-3.5 h-3.5 text-[#8BBB92]" />
          <div className="flex-1 bg-[#092328] border border-[#12544F] rounded px-2.5 py-1 text-[#8BBB92] text-xs font-mono truncate">
            {instanceUri}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={refreshIframe}
            title="Reload frame"
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#12544F]/50 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={instanceUri}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#12544F]/50 transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Iframe View */}
      <div className="flex-1 bg-white relative">
        <iframe
          key={iframeKey}
          src={instanceUri}
          className="w-full h-full border-none"
          title="App Output Preview"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}

