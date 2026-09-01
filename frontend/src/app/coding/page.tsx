"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Socket, io } from "socket.io-client";
import axios from "axios";
import { File, RemoteFile, Type } from "@/components/external/editor/utils/file-manager";
import { Layout, Terminal as TerminalIcon, Eye, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Output from "@/components/Output";

// Dynamic client-only imports to prevent SSR "window is not defined" issues
const Editor = dynamic(() => import("@/components/Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0d1117] text-slate-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Editor...
    </div>
  ),
});

const TerminalComponent = dynamic(() => import("@/components/Terminal"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0d1117] text-slate-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Initializing Terminal...
    </div>
  ),
});

function WorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const replId = searchParams.get("replId") || "";

  const [podCreated, setPodCreated] = useState(false);
  const [podStatus, setPodStatus] = useState<string>("Initializing container...");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [fileStructure, setFileStructure] = useState<RemoteFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [showOutput, setShowOutput] = useState(true);

  // 1. Trigger container provisioning via Next.js internal API route
  useEffect(() => {
    if (!replId) return;

    setPodStatus("Starting Kubernetes Pod...");
    axios
      .post("/api/start", { replId })
      .then((res) => {
        setPodCreated(true);
      })
      .catch((err) => {
        console.warn("Orchestrator warning/error (continuing for development):", err);
        // Continue to allow local dev / mock connection even if K8s is not locally configured
        setPodCreated(true);
      });
  }, [replId]);

  // 2. Connect WebSocket to runner container
  useEffect(() => {
    if (!podCreated || !replId) return;

    // Connect to runner via Ingress domain or fallback
    const wsUrl = process.env.NEXT_PUBLIC_RUNNER_WS_URL || `ws://${replId}.peetcode.com`;
    const newSocket = io(wsUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    setSocket(newSocket);

    newSocket.on("loaded", ({ rootContent }: { rootContent: RemoteFile[] }) => {
      setLoaded(true);
      setFileStructure(rootContent);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("WebSocket connection notice:", err.message);
      // Ensure UI still allows interaction during initial container boot
      setLoaded(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [podCreated, replId]);

  const onSelect = (file: File) => {
    if (file.type === Type.DIRECTORY) {
      socket?.emit("fetchDir", file.path, (data: RemoteFile[]) => {
        setFileStructure((prev) => {
          const allFiles = [...prev, ...(data || [])];
          return allFiles.filter(
            (item, index, self) => index === self.findIndex((f) => f.path === item.path)
          );
        });
      });
    } else {
      socket?.emit("fetchContent", { path: file.path }, (data: string) => {
        file.content = data;
        setSelectedFile(file);
      });
    }
  };

  if (!replId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1117] text-slate-300 p-4">
        <AlertCircle className="w-10 h-10 text-yellow-400 mb-3" />
        <h2 className="text-xl font-bold mb-2">No REPL ID Specified</h2>
        <p className="text-slate-500 text-sm mb-4">Please return to the landing page and start a project.</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Home
        </button>
      </div>
    );
  }

  if (!podCreated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1117] text-slate-300 p-4">
        <div className="p-8 rounded-2xl bg-[#161b22] border border-slate-800 text-center max-w-sm w-full shadow-2xl">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">Booting Cloud Sandbox</h3>
          <p className="text-slate-400 text-xs mb-3">{podStatus}</p>
          <div className="text-[11px] font-mono text-slate-500 bg-[#0d1117] px-3 py-1.5 rounded-md truncate">
            replId: {replId}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117]">
      {/* Top Navigation Bar */}
      <header className="h-12 bg-[#161b22] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Back to Landing"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">Cloud REPL</span>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
              {replId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Pod Active</span>
          </div>

          <button
            onClick={() => setShowOutput((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              showOutput
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showOutput ? "Hide Preview" : "Show Preview"}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Split */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Monaco Code Editor + File Tree */}
        <section className="flex-1 flex min-w-0 border-r border-slate-800 overflow-hidden">
          <Editor
            files={fileStructure}
            onSelect={onSelect}
            selectedFile={selectedFile}
            socket={socket}
          />
        </section>

        {/* Right Side: Output Preview (top) + Terminal (bottom) */}
        <section className="w-[42%] min-w-[320px] max-w-[700px] flex flex-col h-full bg-[#0d1117] overflow-hidden">
          {showOutput && (
            <div className="h-1/2 min-h-[200px]">
              <Output replId={replId} />
            </div>
          )}
          <div className={`${showOutput ? "h-1/2" : "h-full"} min-h-[200px]`}>
            <TerminalComponent socket={socket} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CodingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <WorkspaceInner />
    </Suspense>
  );
}
