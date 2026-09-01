"use client";

import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

interface TerminalProps {
  socket: Socket | null;
}

function arrayBufferToString(buf: any): string {
  if (typeof buf === "string") return buf;
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
}

export default function TerminalComponent({ socket }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current || !socket) return;

    const term = new Terminal({
      cursorBlink: true,
      cols: 100,
      rows: 24,
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        selectionBackground: "#3b5070",
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    termInstanceRef.current = term;

    socket.emit("requestTerminal");

    const terminalHandler = ({ data }: { data: any }) => {
      const decoded = arrayBufferToString(data);
      term.write(decoded);
    };

    socket.on("terminal", terminalHandler);

    const onDataDisposable = term.onData((data) => {
      socket.emit("terminalData", { data });
    });

    // Send initial newline to prompt shell
    socket.emit("terminalData", { data: "\n" });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      socket.off("terminal", terminalHandler);
      onDataDisposable.dispose();
      term.dispose();
    };
  }, [socket]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-t border-slate-800">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-800 text-xs font-medium text-slate-400">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Terminal (Bash)
        </span>
      </div>
      <div className="flex-1 p-2 overflow-hidden" ref={terminalRef} />
    </div>
  );
}