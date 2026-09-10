"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { RefreshCw, Terminal as TerminalIcon, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface TerminalProps {
  socket: Socket | null;
}

type TermStatus = "connecting" | "active" | "retrying" | "disconnected";

function decodeTerminalData(buf: any): string {
  if (typeof buf === "string") return buf;
  if (!buf) return "";

  try {
    const textDecoder = new TextDecoder("utf-8");
    if (buf instanceof ArrayBuffer) {
      return textDecoder.decode(buf);
    }
    if (ArrayBuffer.isView(buf)) {
      return textDecoder.decode(buf);
    }
    if (buf?.data) {
      if (Array.isArray(buf.data) || ArrayBuffer.isView(buf.data)) {
        return textDecoder.decode(new Uint8Array(buf.data));
      }
      if (typeof buf.data === "string") {
        return buf.data;
      }
    }
    if (Array.isArray(buf)) {
      return textDecoder.decode(new Uint8Array(buf));
    }
  } catch (err) {
    console.warn("[Terminal] Decode error:", err);
  }
  return String(buf);
}

export default function TerminalComponent({ socket }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastRequestedSocketIdRef = useRef<string | null>(null);
  const hasReceivedDataRef = useRef(false);

  const [status, setStatus] = useState<TermStatus>("connecting");
  const [attemptCount, setAttemptCount] = useState<number>(0);

  useEffect(() => {
    if (!terminalRef.current) return;

    console.log("[Terminal] Initializing xterm instance");
    lastRequestedSocketIdRef.current = null;
    hasReceivedDataRef.current = false;

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
      fontFamily: 'Menlo, Monaco, "Courier New", Consolas, monospace',
      fontSize: 13,
      convertEol: true,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    termInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln("\x1b[38;5;75m[PodForge]\x1b[0m Connecting to interactive sandbox terminal...");

    const handleResize = () => {
      try {
        fitAddon.fit();
        if (socket && socket.connected) {
          socket.emit("terminalResize", { cols: term.cols, rows: term.rows });
        }
      } catch (e) {}
    };

    window.addEventListener("resize", handleResize);

    const onDataDisposable = term.onData((data) => {
      if (socket && socket.connected) {
        socket.emit("terminalData", { data });
      }
    });

    return () => {
      console.log("[Terminal] Disposing xterm instance");
      window.removeEventListener("resize", handleResize);
      onDataDisposable.dispose();
      term.dispose();
      termInstanceRef.current = null;
      fitAddonRef.current = null;
      lastRequestedSocketIdRef.current = null;
      hasReceivedDataRef.current = false;
    };
  }, []);

  // Handle socket connection and listeners
  useEffect(() => {
    const term = termInstanceRef.current;
    if (!socket || !term) return;

    console.log("[Terminal] Setting up socket listeners. Socket connected:", socket.connected, "socket.id:", socket.id);

    const requestPty = () => {
      if (!socket.connected) {
        console.log("[Terminal] Cannot request PTY: socket is not connected");
        return;
      }
      if (lastRequestedSocketIdRef.current === socket.id && hasReceivedDataRef.current) {
        console.log("[Terminal] PTY already active for socket:", socket.id);
        return;
      }
      lastRequestedSocketIdRef.current = socket.id;
      setStatus("active");
      console.log(`[Terminal] Emitting requestTerminal for socket.id=${socket.id}`);
      socket.emit("requestTerminal");

      // Send terminal size
      socket.emit("terminalResize", { cols: term.cols || 100, rows: term.rows || 24 });

      // Send newline after a short delay to trigger initial shell prompt
      setTimeout(() => {
        if (!hasReceivedDataRef.current && socket.connected) {
          console.log("[Terminal] Sending prompt kick newline");
          socket.emit("terminalData", { data: "\n" });
        }
      }, 500);
    };

    const onConnect = () => {
      console.log("[Terminal] Socket connected event fired, socket.id:", socket.id);
      setStatus("active");
      term.writeln("\x1b[32m[PodForge]\x1b[0m Connected! Launching Bash session...\r\n");
      requestPty();
    };

    const onDisconnect = (reason: string) => {
      console.log("[Terminal] Socket disconnected:", reason);
      setStatus("disconnected");
      lastRequestedSocketIdRef.current = null;
      hasReceivedDataRef.current = false;
      term.writeln(`\r\n\x1b[33m[PodForge] Terminal disconnected (${reason}). Reconnecting...\x1b[0m\r\n`);
    };

    const onConnectError = (err: any) => {
      console.warn("[Terminal] Socket connect_error:", err.message);
      setStatus("retrying");
      setAttemptCount((prev) => prev + 1);
    };

    const onReconnect = () => {
      console.log("[Terminal] Socket reconnected, socket.id:", socket.id);
      setStatus("active");
      term.writeln("\r\n\x1b[32m[PodForge] Reconnected to sandbox!\x1b[0m\r\n");
      lastRequestedSocketIdRef.current = null;
      hasReceivedDataRef.current = false;
      requestPty();
    };

    const terminalHandler = async (payload: any) => {
      let raw = payload?.data ?? payload;
      if (typeof Blob !== "undefined" && raw instanceof Blob) {
        try {
          raw = await raw.text();
        } catch {
          try {
            const ab = await raw.arrayBuffer();
            raw = new Uint8Array(ab);
          } catch {}
        }
      }
      const decoded = decodeTerminalData(raw);
      if (decoded) {
        hasReceivedDataRef.current = true;
        setStatus("active");
        term.write(decoded);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("reconnect", onReconnect);
    socket.on("terminal", terminalHandler);

    if (socket.io) {
      socket.io.on("reconnect", onReconnect);
      socket.io.on("error", onConnectError);
    }

    if (socket.connected) {
      console.log("[Terminal] Socket is already connected, requesting PTY directly for id:", socket.id);
      onConnect();
    } else {
      setStatus("connecting");
      if (socket.disconnected) {
        socket.connect();
      }
    }

    // Safety watchdog: periodically check if connected but no output arrived
    const watchdog = setInterval(() => {
      if (socket.connected && !hasReceivedDataRef.current) {
        console.log("[Terminal] Watchdog: re-requesting terminal on socket", socket.id);
        socket.emit("requestTerminal");
        socket.emit("terminalResize", { cols: term.cols || 100, rows: term.rows || 24 });
        socket.emit("terminalData", { data: "\n" });
      }
    }, 3000);

    return () => {
      console.log("[Terminal] Cleaning up socket event listeners");
      clearInterval(watchdog);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("reconnect", onReconnect);
      socket.off("terminal", terminalHandler);
      if (socket.io) {
        socket.io.off("reconnect", onReconnect);
        socket.io.off("error", onConnectError);
      }
    };
  }, [socket]);

  const handleManualReconnect = () => {
    setStatus("connecting");
    lastRequestedSocketIdRef.current = null;
    hasReceivedDataRef.current = false;
    if (termInstanceRef.current) {
      termInstanceRef.current.writeln("\r\n\x1b[36m[PodForge] Manually reconnecting terminal...\x1b[0m\r\n");
    }
    if (socket) {
      if (socket.connected) {
        socket.emit("requestTerminal");
        socket.emit("terminalResize", { cols: termInstanceRef.current?.cols || 100, rows: termInstanceRef.current?.rows || 24 });
        socket.emit("terminalData", { data: "\n" });
      } else {
        socket.disconnect();
        socket.connect();
      }
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-[#0d1117] border-t border-slate-800"
      onClick={() => termInstanceRef.current?.focus()}
    >
      {/* Terminal Sub-header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-slate-800 text-xs font-medium text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-slate-200">Terminal</span>
          <span className="text-slate-500 font-mono text-[11px]">(bash)</span>

          {/* Status Indicator */}
          {status === "active" ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          ) : status === "retrying" ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              Connecting to pod... {attemptCount > 0 ? `(attempt ${attemptCount})` : ""}
            </span>
          ) : status === "connecting" ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              Initializing...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
              <AlertCircle className="w-3 h-3" />
              Disconnected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualReconnect}
            className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px] flex items-center gap-1 cursor-pointer border border-slate-700"
            title="Force reconnect to terminal"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Reconnect</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 p-2 overflow-hidden cursor-text" ref={terminalRef} />
    </div>
  );
}