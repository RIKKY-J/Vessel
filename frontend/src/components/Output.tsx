"use client";

import { useState } from "react";
import { RefreshCw, ExternalLink, Globe } from "lucide-react";

interface OutputProps {
  replId: string;
}

export default function Output({ replId }: OutputProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const instanceUri = `http://${replId}.autogpt-cloud.com`;

  const refreshIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col h-full bg-[#161b22] border-b border-slate-800">
      {/* Browser Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0d1117] border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 flex-1 mr-3">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex-1 bg-[#161b22] border border-slate-700/80 rounded px-2.5 py-1 text-slate-300 text-xs truncate">
            {instanceUri}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={refreshIframe}
            title="Reload frame"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={instanceUri}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
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