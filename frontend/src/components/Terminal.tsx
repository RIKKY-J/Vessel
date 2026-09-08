"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

interface TerminalProps {
  socket: Socket | null;
}

function decodeTerminalData(buf: any): string {
  if (typeof buf === "string") return buf;
  try {
    const textDecoder = new TextDecoder("utf-8");
    if (buf instanceof ArrayBuffer) {
      return textDecoder.decode(buf);
    }
    if (buf?.data) {
      return textDecoder.decode(new Uint8Array(buf.data));
    }
    if (Array.isArray(buf)) {
      return textDecoder.decode(new Uint8Array(buf));
    }
  } catch (err) {
    console.warn("Decode error:", err);
  }
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
}

export default function TerminalComponent({ socket }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const [isConnected, setIsConnected] = useState(false);

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
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    termInstanceRef.current = term;

    const requestPty = () => {
      setIsConnected(true);
      socket.emit("requestTerminal");
      socket.emit("terminalData", { data: "\n" });
    };

    if (socket.connected) {
      requestPty();
    }

    const onConnect = () => {
      requestPty();
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const terminalHandler = ({ data }: { data: any }) => {
      const decoded = decodeTerminalData(data);
      term.write(decoded);
    };

    socket.on("terminal", terminalHandler);

    const onDataDisposable = term.onData((data) => {
      socket.emit("terminalData", { data });
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch (e) {}
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("terminal", terminalHandler);
      onDataDisposable.dispose();
      term.dispose();
    };
  }, [socket]);

  return (
    <div
      className="flex flex-col h-full bg-[#0d1117] border-t border-slate-800"
      onClick={() => termInstanceRef.current?.focus()}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-800 text-xs font-medium text-slate-400">
        <span className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-emerald-500 animate-pulse"
                : "bg-amber-500"
            }`}
          ></span>
          Terminal (Bash)
          <span className="text-[10px] text-slate-500">
            {isConnected ? "Active" : "Connecting..."}
          </span>
        </span>
      </div>
      <div className="flex-1 p-2 overflow-hidden cursor-text" ref={terminalRef} />
    </div>
  );
}