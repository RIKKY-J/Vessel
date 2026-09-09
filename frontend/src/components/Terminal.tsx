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
    console.warn("[Terminal] Decode error:", err);
  }
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
}

export default function TerminalComponent({ socket }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const ptyRequestedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current || !socket) {
      console.log("[Terminal] Missing ref or socket:", {
        hasRef: !!terminalRef.current,
        hasSocket: !!socket,
      });
      return;
    }

    console.log("[Terminal] Initializing xterm + socket listeners");
    ptyRequestedRef.current = false;

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
      if (ptyRequestedRef.current) {
        console.log("[Terminal] PTY already requested, skipping duplicate");
        return;
      }
      ptyRequestedRef.current = true;
      setIsConnected(true);
      console.log("[Terminal] Emitting requestTerminal");
      socket.emit("requestTerminal");
      // Send a newline to trigger initial prompt
      setTimeout(() => {
        console.log("[Terminal] Sending initial newline");
        socket.emit("terminalData", { data: "\n" });
      }, 500);
    };

    if (socket.connected) {
      console.log("[Terminal] Socket already connected, requesting PTY");
      requestPty();
    } else {
      console.log("[Terminal] Socket not yet connected, waiting...");
    }

    const onConnect = () => {
      console.log("[Terminal] Socket connected event fired, transport:", socket.io?.engine?.transport?.name);
      requestPty();
    };

    const onDisconnect = (reason: string) => {
      console.log("[Terminal] Socket disconnected:", reason);
      setIsConnected(false);
      ptyRequestedRef.current = false;
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const terminalHandler = ({ data }: { data: any }) => {
      const decoded = decodeTerminalData(data);
      console.log("[Terminal] Received terminal data:", decoded.length, "chars", JSON.stringify(decoded.substring(0, 80)));
      term.write(decoded);
    };

    socket.on("terminal", terminalHandler);

    const onDataDisposable = term.onData((data) => {
      console.log("[Terminal] Sending keystroke:", JSON.stringify(data));
      socket.emit("terminalData", { data });
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch (e) {}
    };

    window.addEventListener("resize", handleResize);

    // Auto-focus terminal after a short delay
    setTimeout(() => {
      term.focus();
      console.log("[Terminal] Auto-focused terminal");
    }, 1000);

    return () => {
      console.log("[Terminal] Cleaning up");
      window.removeEventListener("resize", handleResize);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("terminal", terminalHandler);
      onDataDisposable.dispose();
      term.dispose();
      ptyRequestedRef.current = false;
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