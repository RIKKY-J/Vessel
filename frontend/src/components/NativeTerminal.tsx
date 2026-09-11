"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  CornerDownLeft,
  ChevronRight,
  AlertCircle,
  Play,
  Loader2,
} from "lucide-react";
import axios from "axios";

interface TerminalProps {
  socket: Socket | null;
  replId?: string;
}

type TermStatus = "connecting" | "active" | "retrying" | "disconnected";

// Clean ANSI escape sequences and convert basic colors to styled HTML spans
function parseAnsi(text: string): string {
  if (!text) return "";

  // Remove terminal bracketed paste and bell codes
  let clean = text
    .replace(/\x1b\[\?2004[hl]/g, "")
    .replace(/\x07/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Escape HTML characters
  clean = clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Basic ANSI color map
  const colorMap: { [key: string]: string } = {
    "0": "</span>", // Reset
    "1": '<span style="font-weight: bold;">',
    "2": '<span style="opacity: 0.7;">',
    "30": '<span style="color: #64748b;">',
    "31": '<span style="color: #ef4444;">',
    "32": '<span style="color: #22c55e;">',
    "33": '<span style="color: #eab308;">',
    "34": '<span style="color: #3b82f6;">',
    "35": '<span style="color: #a855f7;">',
    "36": '<span style="color: #06b6d4;">',
    "37": '<span style="color: #f8fafc;">',
    "90": '<span style="color: #94a3b8;">',
    "91": '<span style="color: #f87171;">',
    "92": '<span style="color: #4ade80;">',
    "93": '<span style="color: #facc15;">',
    "94": '<span style="color: #60a5fa;">',
    "95": '<span style="color: #c084fc;">',
    "96": '<span style="color: #22d3ee;">',
    "97": '<span style="color: #ffffff;">',
  };

  clean = clean.replace(/\x1b\[([0-9;]+)m/g, (match, code) => {
    const codes = code.split(";");
    return codes.map((c: string) => colorMap[c] || "").join("");
  });

  // Remove any remaining unrecognized escape codes
  clean = clean.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");

  return clean;
}

function decodeData(buf: any): string {
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

export default function NativeTerminal({ socket, replId }: TerminalProps) {
  const [output, setOutput] = useState<string>(
    "\x1b[38;5;75m[Vessel Sandbox]\x1b[0m Direct Cloud Terminal initialized.\n\x1b[32m[Status]\x1b[0m Ready for shell commands.\n\n"
  );
  const [commandInput, setCommandInput] = useState<string>("");
  const [status, setStatus] = useState<TermStatus>("connecting");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const clusterHttpsHost = process.env.NEXT_PUBLIC_CLUSTER_HTTPS_HOST || "100.57.92.214.nip.io:31754";
  const sslAuthUrl = replId ? `https://${replId}.${clusterHttpsHost}/socket.io/` : "";

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastRequestedSocketIdRef = useRef<string | null>(null);

  // Auto-scroll output container to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [output, scrollToBottom]);

  // Handle Socket.IO connection and terminal streaming
  useEffect(() => {
    if (!socket) return;

    console.log("[NativeTerminal] Listening on socket.id:", socket.id, "connected:", socket.connected);

    const requestPty = () => {
      if (!socket.connected) return;
      if (lastRequestedSocketIdRef.current === socket.id) return;
      lastRequestedSocketIdRef.current = socket.id;
      setStatus("active");
      console.log("[NativeTerminal] Emitting requestTerminal for socket:", socket.id);
      socket.emit("requestTerminal");
      socket.emit("terminalResize", { cols: 100, rows: 30 });
    };

    const onConnect = () => {
      console.log("[NativeTerminal] Socket connected:", socket.id);
      setStatus("active");
      setOutput((prev) => prev + "\x1b[32m[Vessel]\x1b[0m Connected to runner sandbox! Bash session active.\n");
      requestPty();
    };

    const onDisconnect = (reason: string) => {
      console.log("[NativeTerminal] Socket disconnected:", reason);
      lastRequestedSocketIdRef.current = null;
      if (status === "active") {
        setStatus("disconnected");
        setOutput((prev) => prev + `\n\x1b[33m[Vessel] Live PTY disconnected (${reason}). Switched to Cloud Exec.\x1b[0m\n`);
      }
    };

    const onConnectError = (err: any) => {
      console.warn("[NativeTerminal] Connect error:", err.message);
      if (status === "connecting") {
        setStatus("retrying");
      }
    };

    const onTerminalData = async (payload: any) => {
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
      const text = decodeData(raw);
      if (text) {
        setStatus("active");
        setOutput((prev) => {
          // Keep buffer manageable to prevent memory bloat
          const combined = prev + text;
          return combined.length > 50000 ? combined.slice(-35000) : combined;
        });
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("terminal", onTerminalData);

    if (socket.io) {
      socket.io.on("reconnect", onConnect);
      socket.io.on("error", onConnectError);
    }

    if (socket.connected) {
      onConnect();
    } else {
      setStatus("connecting");
      if (socket.disconnected) {
        socket.connect();
      }
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("terminal", onTerminalData);
      if (socket.io) {
        socket.io.off("reconnect", onConnect);
        socket.io.off("error", onConnectError);
      }
    };
  }, [socket]);

  // Execute terminal command
  const sendCommand = (cmdToSend?: string) => {
    const cmd = cmdToSend !== undefined ? cmdToSend : commandInput;
    const trimmed = cmd.trim();

    if (!trimmed) {
      // Just sending an empty Enter kicks the prompt
      if (socket && socket.connected) {
        socket.emit("terminalData", { data: "\n" });
      }
      return;
    }

    // Special client commands
    if (trimmed === "clear") {
      setOutput("");
      setCommandInput("");
      return;
    }

    // Append to local history
    setHistory((prev) => [...prev.filter((h) => h !== trimmed), trimmed]);
    setHistoryIndex(-1);

    // Write to terminal stdout
    setOutput((prev) => prev + `\x1b[36m$ ${trimmed}\x1b[0m\n`);

    // Emit to runner bash session (Socket.IO) or Direct Cloud Exec fallback
    if (socket && socket.connected) {
      socket.emit("terminalData", { data: `${trimmed}\n` });
    } else if (replId) {
      setIsExecuting(true);
      axios
        .post("/api/terminal/exec", { replId, command: trimmed })
        .then((res) => {
          const { stdout, stderr, exitCode } = res.data;
          if (stdout) setOutput((prev) => prev + stdout + (stdout.endsWith("\n") ? "" : "\n"));
          if (stderr) setOutput((prev) => prev + `\x1b[31m${stderr}\x1b[0m` + (stderr.endsWith("\n") ? "" : "\n"));
          if (!stdout && !stderr) {
            setOutput((prev) => prev + `\x1b[32m[Command completed with exit code ${exitCode}]\x1b[0m\n`);
          }
        })
        .catch((err) => {
          const msg = err.response?.data?.error || err.message;
          setOutput((prev) => prev + `\x1b[31m[Sandbox Exec Error] ${msg}\x1b[0m\n`);
        })
        .finally(() => {
          setIsExecuting(false);
          setTimeout(() => {
            scrollToBottom();
            inputRef.current?.focus();
          }, 50);
        });
    } else {
      setOutput((prev) => prev + "\x1b[31m[Error] Not connected to sandbox. Reconnecting...\x1b[0m\n");
      socket?.connect();
    }

    setCommandInput("");
  };

  // Keyboard navigation for command history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommandInput(history[nextIndex] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setCommandInput("");
      } else {
        setHistoryIndex(nextIndex);
        setCommandInput(history[nextIndex] || "");
      }
    }
  };

  const handleCopyOutput = () => {
    // Strip HTML/ANSI tags for plain text copying
    const plainText = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReconnect = () => {
    setStatus("connecting");
    lastRequestedSocketIdRef.current = null;
    setOutput((prev) => prev + "\n\x1b[36m[Vessel] Manually reconnecting terminal session...\x1b[0m\n");
    if (socket) {
      if (socket.connected) {
        socket.emit("requestTerminal");
        socket.emit("terminalData", { data: "\n" });
      } else {
        socket.connect();
      }
    }
  };

  const quickChips = [
    { label: "ls -la", cmd: "ls -la" },
    { label: "pwd", cmd: "pwd" },
    { label: "node -v", cmd: "node -v" },
    { label: "python3 --version", cmd: "python3 --version" },
    { label: "node --watch index.js &", cmd: "node --watch index.js &" },
    { label: "clear", cmd: "clear" },
  ];

  return (
    <div
      className="flex flex-col h-full bg-[#092328] border-t border-[#12544F] font-mono text-xs select-text overflow-hidden"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12544F]/20 border-b border-[#12544F] select-none shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-[#8BBB92]" />
          <span className="font-semibold text-slate-200">Terminal</span>
          <span className="text-[#8BBB92]/60 text-[11px]">(interactive bash)</span>

          {/* Status Badge */}
          {status === "active" ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#8BBB92] bg-[#2A835F]/20 px-2 py-0.5 rounded-full border border-[#2A835F]/35" title="Connected to runner Socket.IO PTY">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8BBB92] animate-pulse" />
              Live PTY
            </span>
          ) : isExecuting ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running...
            </span>
          ) : replId ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#8BBB92] bg-[#2A835F]/15 px-2 py-0.5 rounded-full border border-[#2A835F]/30" title="Direct Cloud Pod Execution is active">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8BBB92]" />
              Cloud Exec
            </span>
          ) : status === "connecting" ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#8BBB92] bg-[#2A835F]/20 px-2 py-0.5 rounded-full border border-[#2A835F]/35">
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

        {/* Toolbar actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyOutput}
            className="px-2 py-1 rounded bg-[#12544F]/40 hover:bg-[#12544F] text-slate-300 hover:text-white transition text-[11px] flex items-center gap-1 border border-[#12544F] cursor-pointer"
            title="Copy terminal output"
          >
            {copied ? <Check className="w-3 h-3 text-[#8BBB92]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={() => setOutput("")}
            className="px-2 py-1 rounded bg-[#12544F]/40 hover:bg-[#12544F] text-slate-300 hover:text-white transition text-[11px] flex items-center gap-1 border border-[#12544F] cursor-pointer"
            title="Clear terminal log"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>

          <button
            onClick={handleReconnect}
            className="px-2 py-1 rounded bg-[#12544F]/40 hover:bg-[#12544F] text-slate-300 hover:text-white transition text-[11px] flex items-center gap-1 border border-[#12544F] cursor-pointer"
            title="Reconnect shell session"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect</span>
          </button>
        </div>
      </div>

      {/* Vercel HTTPS Self-Signed Notice */}
      {isHttps && status !== "active" && replId && (
        <div className="bg-[#12544F]/30 border-b border-[#12544F] px-3 py-1.5 flex items-center justify-between text-[11px] text-[#8BBB92] shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8BBB92] shrink-0" />
            <span className="truncate">
              Direct Cloud Exec is active. Commands run directly inside your sandbox pod.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <a
              href={sslAuthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8BBB92] hover:text-white underline font-semibold text-[10px]"
              title="Open sandbox in new tab to accept self-signed SSL certificate for live streaming PTY"
            >
              Authorize SSL for Live PTY ↗
            </a>
          </div>
        </div>
      )}

      {/* Terminal Log Output Viewport */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-[12px] leading-relaxed text-slate-200 whitespace-pre-wrap selection:bg-[#2A835F]/40"
      >
        <div dangerouslySetInnerHTML={{ __html: parseAnsi(output) }} />
      </div>

      {/* Quick Action Chips */}
      <div className="px-3 py-1 bg-[#092328] border-t border-[#12544F]/40 flex items-center gap-1.5 overflow-x-auto select-none shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-[#8BBB92]/60 mr-1">Quick:</span>
        {quickChips.map(({ label, cmd }) => (
          <button
            key={label}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              sendCommand(cmd);
            }}
            className="px-2 py-0.5 rounded bg-[#12544F]/30 hover:bg-[#2A835F]/30 text-slate-300 hover:text-[#8BBB92] border border-[#12544F]/60 text-[11px] transition cursor-pointer shrink-0"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Interactive Command Input Prompt */}
      <div className="flex items-center px-3 py-2 bg-[#12544F]/25 border-t border-[#12544F] shrink-0">
        <div className="flex items-center gap-1.5 text-[#8BBB92] font-semibold select-none shrink-0">
          <span className="text-[#8BBB92]">root@sandbox</span>
          <span className="text-[#8BBB92]/50">:</span>
          <span className="text-[#8BBB92]">/workspace</span>
          <span className="text-[#2A835F] font-bold">$</span>
        </div>

        <div className="flex-1 flex items-center ml-2 relative">
          <input
            ref={inputRef}
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type bash command and press Enter (e.g. ls, python3 main.py, npm start)..."
            className="w-full bg-transparent text-white font-mono text-xs focus:outline-none placeholder-slate-500"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        <button
          type="button"
          onClick={() => sendCommand()}
          disabled={!commandInput.trim() || isExecuting}
          className="ml-2 px-2.5 py-1 rounded bg-[#2A835F] hover:brightness-110 disabled:opacity-40 text-white text-[11px] font-medium transition flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
        >
          {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
          <span>{isExecuting ? "Running" : "Run"}</span>
        </button>
      </div>
    </div>
  );
}
