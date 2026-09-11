"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import axios from "axios";

interface TerminalProps {
  socket: Socket | null;
  replId?: string;
}

type TermStatus = "connecting" | "active" | "retrying" | "disconnected";

function decodeData(buf: any): string {
  if (typeof buf === "string") return buf;
  if (!buf) return "";

  // 1. Raw ArrayBuffer
  if (buf instanceof ArrayBuffer) {
    try {
      return new TextDecoder("utf-8").decode(new Uint8Array(buf));
    } catch {
      return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
    }
  }

  // 2. TypedArray or DataView (Uint8Array, etc.)
  if (buf instanceof Uint8Array || ArrayBuffer.isView(buf)) {
    try {
      return new TextDecoder("utf-8").decode(buf);
    } catch {
      return String.fromCharCode.apply(null, Array.from(buf as any));
    }
  }

  // 3. Object with data property (e.g. { data: ArrayBuffer } or { data: [...] })
  if (typeof buf === "object") {
    if (buf.data instanceof ArrayBuffer) {
      return decodeData(buf.data);
    }
    if (buf.data instanceof Uint8Array || ArrayBuffer.isView(buf.data)) {
      return decodeData(buf.data);
    }
    if (Array.isArray(buf.data)) {
      try {
        return new TextDecoder("utf-8").decode(new Uint8Array(buf.data));
      } catch {
        return String.fromCharCode.apply(null, buf.data);
      }
    }
    if (typeof (buf as any).toString === "function" && buf.constructor?.name === "Buffer") {
      return buf.toString("utf-8");
    }
  }

  return "";
}

export default function NativeTerminal({ socket, replId }: TerminalProps) {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);

  const [status, setStatus] = useState<TermStatus>("connecting");
  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const isExecutingRef = useRef<boolean>(false);

  const lastRequestedSocketIdRef = useRef<string | null>(null);
  const hasReceivedDataRef = useRef<boolean>(false);

  // Fallback command line buffer when WebSocket is not connected
  const fallbackLineRef = useRef<string>("");
  const fallbackHistoryRef = useRef<string[]>([]);
  const fallbackHistoryIndexRef = useRef<number>(-1);

  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const clusterHost = isHttps
    ? (process.env.NEXT_PUBLIC_CLUSTER_HTTPS_HOST || "100.57.92.214.nip.io:31754")
    : (process.env.NEXT_PUBLIC_CLUSTER_HOST || "100.57.92.214.nip.io:31516");
  const sslAuthUrl = replId ? `https://${replId}.${clusterHost}` : "#";

  const prompt = "\x1b[38;2;231;63;30mroot@sandbox\x1b[0m:\x1b[34m/workspace\x1b[0m$ ";


  // Fallback key handler for direct interactive typing when socket is not active
  const handleFallbackKey = useCallback(
    async (key: string) => {
      const term = termRef.current;
      if (!term) return;

      // Ignore normal keystrokes while a command is actively executing
      if (isExecutingRef.current) {
        if (key === "\x03") {
          fallbackLineRef.current = "";
          term.writeln("^C");
          setIsExecuting(false);
          isExecutingRef.current = false;
          term.write(prompt);
        }
        return;
      }

      // Enter
      if (key === "\r" || key === "\n") {
        term.write("\r\n");
        const cmd = fallbackLineRef.current.trim();
        fallbackLineRef.current = "";
        fallbackHistoryIndexRef.current = -1;

        if (!cmd) {
          term.write(prompt);
          return;
        }

        fallbackHistoryRef.current.push(cmd);

        if (cmd === "clear") {
          term.clear();
          term.write(prompt);
          return;
        }

        setIsExecuting(true);
        isExecutingRef.current = true;
        try {
          const res = await axios.post("/api/terminal/exec", {
            replId,
            command: cmd,
          });

          const stdout = res.data?.stdout || "";
          const stderr = res.data?.stderr || "";
          const output = res.data?.output || "";
          const exitCode = res.data?.exitCode ?? 0;

          let hasWritten = false;

          // Render stdout
          if (stdout) {
            const formatted = stdout.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
            term.write(formatted);
            if (!formatted.endsWith("\r\n")) term.write("\r\n");
            hasWritten = true;
          }

          // Render stderr (highlighted in red)
          if (stderr) {
            const formattedErr = stderr.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
            term.write(`\x1b[31m${formattedErr}\x1b[0m`);
            if (!formattedErr.endsWith("\r\n")) term.write("\r\n");
            hasWritten = true;
          }

          // Fallback to combined output if neither stdout nor stderr were populated
          if (!hasWritten && output) {
            const formattedOut = output.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
            term.write(formattedOut);
            if (!formattedOut.endsWith("\r\n")) term.write("\r\n");
            hasWritten = true;
          }

          // If command exited non-zero with no output, inform user
          if (!hasWritten && exitCode !== 0) {
            term.writeln(`\x1b[31m[Process exited with status ${exitCode}]\x1b[0m`);
          }
        } catch (err: any) {
          const errDetail =
            err?.response?.data?.stderr ||
            err?.response?.data?.error ||
            err?.response?.data?.output ||
            err?.message ||
            "Command execution failed";
          const formatted = String(errDetail).replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
          term.writeln(`\x1b[31mError: ${formatted}\x1b[0m`);
        } finally {
          setIsExecuting(false);
          isExecutingRef.current = false;
          term.write(prompt);
        }
        return;
      }

      // Backspace (\x7F or \b)
      if (key === "\x7f" || key === "\b") {
        if (fallbackLineRef.current.length > 0) {
          fallbackLineRef.current = fallbackLineRef.current.slice(0, -1);
          term.write("\b \b");
        }
        return;
      }

      // Ctrl+C (\x03)
      if (key === "\x03") {
        fallbackLineRef.current = "";
        term.writeln("^C");
        term.write(prompt);
        return;
      }

      // Up Arrow (\x1b[A)
      if (key === "\x1b[A") {
        const history = fallbackHistoryRef.current;
        if (history.length === 0) return;
        const nextIndex =
          fallbackHistoryIndexRef.current === -1
            ? history.length - 1
            : Math.max(0, fallbackHistoryIndexRef.current - 1);
        fallbackHistoryIndexRef.current = nextIndex;
        const cmd = history[nextIndex] || "";

        while (fallbackLineRef.current.length > 0) {
          term.write("\b \b");
          fallbackLineRef.current = fallbackLineRef.current.slice(0, -1);
        }
        fallbackLineRef.current = cmd;
        term.write(cmd);
        return;
      }

      // Down Arrow (\x1b[B)
      if (key === "\x1b[B") {
        const history = fallbackHistoryRef.current;
        if (fallbackHistoryIndexRef.current === -1) return;
        const nextIndex = fallbackHistoryIndexRef.current + 1;

        while (fallbackLineRef.current.length > 0) {
          term.write("\b \b");
          fallbackLineRef.current = fallbackLineRef.current.slice(0, -1);
        }

        if (nextIndex >= history.length) {
          fallbackHistoryIndexRef.current = -1;
          fallbackLineRef.current = "";
        } else {
          fallbackHistoryIndexRef.current = nextIndex;
          const cmd = history[nextIndex] || "";
          fallbackLineRef.current = cmd;
          term.write(cmd);
        }
        return;
      }

      // Normal printable keys
      if (key >= " " || key === "\t") {
        fallbackLineRef.current += key;
        term.write(key);
      }
    },
    [prompt, replId]
  );

  // Initialize xterm.js instance
  useEffect(() => {
    let isMounted = true;

    const initTerminal = async () => {
      if (!terminalContainerRef.current) return;
      terminalContainerRef.current.innerHTML = "";

      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");

      if (!isMounted) return;

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "block",
        fontFamily: "'Fira Code', Menlo, Monaco, 'Courier New', monospace",
        fontSize: 12,
        lineHeight: 1.25,
        theme: {
          background: "#0B0D11",
          foreground: "#F8FAFC",
          cursor: "#FFFFFF",
          cursorAccent: "#0B0D11",
          selectionBackground: "#E73F1E45",
          black: "#0B0D11",
          red: "#EF4444",
          green: "#22C55E",
          yellow: "#F59E0B",
          blue: "#3B82F6",
          magenta: "#A855F7",
          cyan: "#06B6D4",
          white: "#F8FAFC",
          brightBlack: "#475569",
          brightRed: "#F87171",
          brightGreen: "#4ADE80",
          brightYellow: "#FBBF24",
          brightBlue: "#60A5FA",
          brightMagenta: "#C084FC",
          brightCyan: "#22D3EE",
          brightWhite: "#FFFFFF",
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      term.open(terminalContainerRef.current);
      fitAddon.fit();

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      // Welcome Banner
      term.writeln("\x1b[38;2;231;63;30m=== Vessel Cloud Sandbox Terminal ===\x1b[0m");
      term.writeln("Direct interactive PTY bash session connected to container.");
      term.writeln("Pre-installed modules: \x1b[32mexpress\x1b[0m, \x1b[32mcors\x1b[0m, \x1b[32mdotenv\x1b[0m (NODE_PATH ready)\r\n");
      term.write(prompt);

      // Handle Direct Keypresses from the user!
      term.onData((data) => {
        if (socket && socket.connected) {
          // Direct real-time streaming to bash PTY!
          socket.emit("terminalData", { data });
        } else {
          // Fallback direct interactive handling without input box
          handleFallbackKey(data);
        }
      });

      // Auto-fit on window resize
      const handleResize = () => {
        try {
          fitAddon.fit();
          if (socket && socket.connected) {
            socket.emit("terminalResize", { cols: term.cols, rows: term.rows });
          }
        } catch {}
      };

      window.addEventListener("resize", handleResize);

      // ResizeObserver to handle container panel drag resizing
      const ro = new ResizeObserver(() => {
        try {
          fitAddon.fit();
          if (socket && socket.connected) {
            socket.emit("terminalResize", { cols: term.cols, rows: term.rows });
          }
        } catch {}
      });
      ro.observe(terminalContainerRef.current);

      // Auto-focus after opening
      setTimeout(() => {
        term.focus();
      }, 300);
    };

    initTerminal();

    return () => {
      isMounted = false;
      if (termRef.current) {
        termRef.current.dispose();
      }
    };
  }, [handleFallbackKey, socket]);

  // Connect Socket.IO PTY events to xterm
  useEffect(() => {
    if (!socket) return;

    const requestPty = () => {
      if (!socket.connected) return;
      if (lastRequestedSocketIdRef.current === socket.id) return;
      lastRequestedSocketIdRef.current = socket.id;
      setStatus("active");
      const term = termRef.current;
      socket.emit("requestTerminal");
      if (term) {
        socket.emit("terminalResize", { cols: term.cols || 100, rows: term.rows || 24 });
        socket.emit("terminalData", { data: "\n" });
      }
    };

    const onConnect = () => {
      setStatus("active");
      requestPty();
    };

    const onDisconnect = (reason: string) => {
      lastRequestedSocketIdRef.current = null;
      hasReceivedDataRef.current = false;
      setStatus("disconnected");
      if (termRef.current) {
        termRef.current.writeln(`\r\n\x1b[33m[Vessel] PTY disconnected (${reason}). Interactive fallback active.\x1b[0m\r\n`);
        termRef.current.write(prompt);
      }
    };

    const onConnectError = (err: any) => {
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
      if (text && termRef.current) {
        hasReceivedDataRef.current = true;
        setStatus("active");
        termRef.current.write(text);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("terminal", onTerminalData);

    if (socket.connected) {
      onConnect();
    } else {
      setStatus("connecting");
      if (socket.disconnected) {
        socket.connect();
      }
    }

    // Periodic watchdog to ensure PTY prompt appears
    const watchdog = setInterval(() => {
      if (socket.connected && !hasReceivedDataRef.current) {
        socket.emit("requestTerminal");
        const term = termRef.current;
        if (term) {
          socket.emit("terminalResize", { cols: term.cols || 100, rows: term.rows || 24 });
          socket.emit("terminalData", { data: "\n" });
        }
      }
    }, 2500);

    return () => {
      clearInterval(watchdog);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("terminal", onTerminalData);
    };
  }, [prompt, socket, status]);

  const handleReconnect = () => {
    setStatus("connecting");
    lastRequestedSocketIdRef.current = null;
    hasReceivedDataRef.current = false;
    if (termRef.current) {
      termRef.current.writeln("\r\n\x1b[36m[Vessel] Reconnecting terminal session...\x1b[0m\r\n");
      termRef.current.focus();
    }
    if (socket) {
      if (socket.connected) {
        socket.emit("requestTerminal");
        if (termRef.current) {
          socket.emit("terminalResize", { cols: termRef.current.cols || 100, rows: termRef.current.rows || 24 });
          socket.emit("terminalData", { data: "\n" });
        }
      } else {
        socket.disconnect();
        socket.connect();
      }
    }
  };

  const handleClear = () => {
    if (termRef.current) {
      termRef.current.clear();
      termRef.current.write(prompt);
      termRef.current.focus();
    }
  };

  const handleCopy = () => {
    if (termRef.current) {
      const selection = termRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      termRef.current.focus();
    }
  };

  const sendQuickCommand = (cmd: string) => {
    if (termRef.current) {
      termRef.current.focus();
    }
    if (socket && socket.connected) {
      socket.emit("terminalData", { data: cmd + "\r" });
    } else {
      if (isExecutingRef.current) return;
      if (cmd === "clear") {
        termRef.current?.clear();
        termRef.current?.write(prompt);
      } else {
        fallbackLineRef.current = cmd;
        termRef.current?.write(cmd);
        handleFallbackKey("\r");
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
      className="flex flex-col h-full bg-[#0B0D11] border-t border-[#232936] font-mono text-xs select-none overflow-hidden"
      onClick={() => termRef.current?.focus()}
    >
      {/* Terminal Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12151B] border-b border-[#232936] select-none shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-[#E73F1E]" />
          <span className="font-semibold text-white">Terminal</span>
          <span className="text-slate-400 text-[11px]">(direct interactive bash)</span>

          {/* Status Badge */}
          {status === "active" ? (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] text-white bg-[#181C24] px-2.5 py-0.5 rounded-full border border-[#232936]"
              title="Connected to runner Socket.IO PTY"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E73F1E] animate-pulse" />
              Live PTY
            </span>
          ) : isExecuting ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#E73F1E] bg-[#181C24] px-2.5 py-0.5 rounded-full border border-[#E73F1E]/50">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running...
            </span>
          ) : replId ? (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] text-white bg-[#181C24] px-2.5 py-0.5 rounded-full border border-[#232936]"
              title="Direct Cloud Pod Execution is active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E73F1E]" />
              Cloud Exec
            </span>
          ) : status === "connecting" ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 bg-[#181C24] px-2.5 py-0.5 rounded-full border border-[#232936]">
              <Loader2 className="w-3 h-3 animate-spin text-[#E73F1E]" />
              Initializing...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-red-400 bg-[#181C24] px-2.5 py-0.5 rounded-full border border-red-500/30">
              <AlertCircle className="w-3 h-3" />
              Disconnected
            </span>
          )}
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="px-2 py-1 rounded bg-[#181C24] hover:bg-[#232936] text-slate-300 hover:text-white transition text-[11px] flex items-center gap-1 border border-[#232936] cursor-pointer"
            title="Copy selection"
          >
            {copied ? <Check className="w-3 h-3 text-[#E73F1E]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={handleClear}
            className="px-2 py-1 rounded bg-[#181C24] hover:bg-[#232936] text-slate-300 hover:text-white transition text-[11px] flex items-center gap-1 border border-[#232936] cursor-pointer"
            title="Clear terminal screen"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>

          <button
            onClick={handleReconnect}
            className="px-2 py-1 rounded bg-[#181C24] hover:bg-[#232936] text-slate-300 hover:text-white transition text-[11px] flex items-center gap-1 border border-[#232936] cursor-pointer"
            title="Reconnect shell session"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect</span>
          </button>
        </div>
      </div>

      {/* Vercel HTTPS Self-Signed Notice */}
      {isHttps && status !== "active" && replId && (
        <div className="bg-[#12151B] border-b border-[#232936] px-3 py-1 flex items-center justify-between text-[11px] text-slate-300 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E73F1E] shrink-0" />
            <span className="truncate">
              Direct terminal mode active. Type directly on the screen below.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <a
              href={sslAuthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E73F1E] hover:text-[#ff4d29] underline font-semibold text-[10px] flex items-center gap-0.5"
              title="Open sandbox in new tab to accept self-signed SSL certificate for live streaming PTY"
            >
              <span>Enable Full PTY ↗</span>
            </a>
          </div>
        </div>
      )}

      {/* Quick Action Chips */}
      <div className="px-3 py-1 bg-[#12151B]/80 border-b border-[#232936] flex items-center gap-1.5 overflow-x-auto select-none shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mr-1">
          Quick:
        </span>
        {quickChips.map(({ label, cmd }) => (
          <button
            key={label}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              sendQuickCommand(cmd);
            }}
            className="px-2 py-0.5 rounded bg-[#181C24] hover:bg-[#232936] text-slate-200 hover:text-white border border-[#232936] hover:border-[#E73F1E] text-[10px] transition cursor-pointer shrink-0 font-mono"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Direct Interactive Terminal Viewport (xterm.js Canvas & PTY) - ZERO INPUT BOX */}
      <div
        ref={terminalContainerRef}
        className="flex-1 w-full h-full p-2 bg-[#0B0D11] overflow-hidden cursor-text select-text"
      />
    </div>
  );
}
