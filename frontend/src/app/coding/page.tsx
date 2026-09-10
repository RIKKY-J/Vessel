"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Socket, io } from "socket.io-client";
import axios from "axios";
import { File, RemoteFile, Type } from "@/components/external/editor/utils/file-manager";
import {
  Columns,
  Code2,
  Globe,
  Terminal as TerminalIcon,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Square,
  Save,
} from "lucide-react";
import Output from "@/components/Output";

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

type ViewMode = "split" | "code" | "preview" | "terminal";

function WorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const replId = searchParams.get("replId") || "";
  const language = searchParams.get("lang") || searchParams.get("language") || "node-js";

  const [podCreated, setPodCreated] = useState(false);
  const [podStatus, setPodStatus] = useState<string>("Initializing container...");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [fileStructure, setFileStructure] = useState<RemoteFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);

  // Split layout state
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [mainSplit, setMainSplit] = useState<number>(55);   // left panel % width
  const [rightSplit, setRightSplit] = useState<number>(50); // preview % height in right panel
  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  const workspaceRef = useRef<HTMLElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);

  const [isStopping, setIsStopping] = useState(false);
  const [stopMessage, setStopMessage] = useState<string>("Saving project to S3...");

  // Send beacon on tab close / reload so pod does not run indefinitely
  useEffect(() => {
    if (!replId) return;

    const handleBeforeUnload = () => {
      try {
        const payload = JSON.stringify({ replId });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/stop", blob);
      } catch (err) {
        console.warn("Error sending stop beacon:", err);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [replId]);

  const handleCloseProject = async () => {
    if (isStopping) return;
    setIsStopping(true);
    setStopMessage("Syncing all workspace files to S3...");

    // 1. Ask runner via websocket to sync all files to S3
    try {
      if (socket && socket.connected) {
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 2000);
          socket.emit("saveAll", () => {
            clearTimeout(timeout);
            resolve(true);
          });
        });
      }
    } catch (e) {
      console.warn("Socket sync error:", e);
    }

    // 2. Terminate Kubernetes Pod and release resources
    setStopMessage("Terminating Kubernetes Pod and freeing cluster resources...");
    try {
      await axios.post("/api/stop", { replId });
    } catch (e) {
      console.warn("Error calling /api/stop:", e);
    }

    setStopMessage("Workspace saved and pod terminated. Redirecting to home...");
    setTimeout(() => {
      router.push("/?saved=" + encodeURIComponent(replId));
    }, 500);
  };

  // 1. Provision container & monitor real-time pod readiness
  useEffect(() => {
    if (!replId) return;
    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;
    let safetyTimeout: NodeJS.Timeout | null = null;

    setPodStatus("Submitting Kubernetes deployment...");

    const checkStatus = async () => {
      try {
        const res = await axios.get(`/api/status?replId=${encodeURIComponent(replId)}`);
        if (!isMounted) return;

        if (res.data?.statusText) {
          setPodStatus(res.data.statusText);
        }

        if (res.data?.ready) {
          if (pollInterval) clearInterval(pollInterval);
          if (safetyTimeout) clearTimeout(safetyTimeout);
          setPodStatus("Sandbox pod ready! Connecting workspace...");
          setTimeout(() => {
            if (isMounted) setPodCreated(true);
          }, 500);
        }
      } catch (err) {
        // Will retry on next tick
      }
    };

    axios
      .post("/api/start", { replId, language })
      .then(() => {
        if (!isMounted) return;
        setPodStatus("Deployment accepted. Waiting for pod to start...");
        checkStatus();
        pollInterval = setInterval(checkStatus, 1200);
      })
      .catch((err) => {
        console.warn("Orchestrator warning (continuing for dev):", err);
        if (!isMounted) return;
        setPodStatus("Starting pod...");
        checkStatus();
        pollInterval = setInterval(checkStatus, 1500);
      });

    // Safety timeout: In case status check is delayed, enter workspace after 20s
    safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.log("[Workspace] Safety timeout reached, proceeding to workspace");
        if (pollInterval) clearInterval(pollInterval);
        setPodCreated(true);
      }
    }, 20000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (safetyTimeout) clearTimeout(safetyTimeout);
    };
  }, [replId, language]);

  // 2. Connect WebSocket
  useEffect(() => {
    if (!podCreated || !replId) return;

    const clusterHost = process.env.NEXT_PUBLIC_CLUSTER_HOST || "52.90.6.151.nip.io:31516";
    let wsUrl = process.env.NEXT_PUBLIC_RUNNER_WS_URL;
    if (!wsUrl) {
      const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "https:" : "http:";
      wsUrl = `${protocol}//${replId}.${clusterHost}`;
    }

    console.log(`[Workspace] Connecting WebSocket to: ${wsUrl}`);
    const newSocket = io(wsUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 4000,
      timeout: 20000,
      query: { replId },
      auth: { replId },
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log(`[Workspace] Connected to runner socket: id=${newSocket.id}, transport=${newSocket.io?.engine?.transport?.name}`);
    });

    newSocket.on("loaded", ({ rootContent }: { rootContent: RemoteFile[] }) => {
      console.log(`[Workspace] Received rootContent (${rootContent?.length || 0} items)`);
      setLoaded(true);
      setFileStructure(rootContent);
    });

    newSocket.on("connect_error", (err) => {
      console.warn(`[Workspace] WebSocket connecting / retrying: ${err.message}`);
      // Do not prematurely setLoaded(true) on first connect_error while container is still spinning up
    });

    newSocket.on("disconnect", (reason) => {
      console.log(`[Workspace] Socket disconnected: ${reason}`);
    });

    return () => {
      console.log("[Workspace] Cleaning up socket connection");
      newSocket.disconnect();
    };
  }, [podCreated, replId]);

  // Main horizontal split drag (Left Editor <-> Right Panel)
  useEffect(() => {
    if (!isDraggingMain) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      if (newRatio >= 20 && newRatio <= 80) {
        setMainSplit(newRatio);
        window.dispatchEvent(new Event("resize"));
      }
    };
    const handleMouseUp = () => {
      setIsDraggingMain(false);
      window.dispatchEvent(new Event("resize"));
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingMain]);

  // Right vertical split drag (Preview <-> Terminal)
  useEffect(() => {
    if (!isDraggingRight) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!rightPanelRef.current) return;
      const rect = rightPanelRef.current.getBoundingClientRect();
      const newRatio = ((e.clientY - rect.top) / rect.height) * 100;
      if (newRatio >= 15 && newRatio <= 85) {
        setRightSplit(newRatio);
        window.dispatchEvent(new Event("resize"));
      }
    };
    const handleMouseUp = () => {
      setIsDraggingRight(false);
      window.dispatchEvent(new Event("resize"));
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingRight]);

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

  const handleCreateFile = (filename: string) => {
    let cleanPath = filename.trim().replace(/\\/g, "/");
    if (!cleanPath.startsWith("/")) cleanPath = `/${cleanPath}`;
    const fileName = cleanPath.split("/").pop() || cleanPath;
    const newRemoteFile: RemoteFile = { type: "file", name: fileName, path: cleanPath };
    setFileStructure((prev) => prev.some((f) => f.path === cleanPath) ? prev : [...prev, newRemoteFile]);
    socket?.emit("updateContent", { path: cleanPath, content: "" });
    const newFileObj: File = {
      id: cleanPath, name: fileName, path: cleanPath,
      parentId: cleanPath.split("/").length === 2 ? "0" : undefined,
      type: Type.FILE, depth: Math.max(0, cleanPath.split("/").length - 2), content: "",
    };
    setSelectedFile(newFileObj);
  };

  const handleCreateFolder = (foldername: string) => {
    let cleanPath = foldername.trim().replace(/\\/g, "/");
    if (!cleanPath.startsWith("/")) cleanPath = `/${cleanPath}`;
    const folderName = cleanPath.split("/").pop() || cleanPath;
    const newRemoteDir: RemoteFile = { type: "dir", name: folderName, path: cleanPath };
    setFileStructure((prev) => prev.some((f) => f.path === cleanPath) ? prev : [...prev, newRemoteDir]);
    socket?.emit("createFolder", { path: cleanPath });
  };

  const handleRefresh = () => {
    socket?.emit("fetchDir", "", (data: RemoteFile[]) => {
      if (data && Array.isArray(data)) setFileStructure(data);
    });
  };

  if (!replId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1117] text-slate-300 p-4">
        <AlertCircle className="w-10 h-10 text-yellow-400 mb-3" />
        <h2 className="text-xl font-bold mb-2">No REPL ID Specified</h2>
        <p className="text-slate-500 text-sm mb-4">Please return to the landing page and start a project.</p>
        <button onClick={() => router.push("/")} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go to Home
        </button>
      </div>
    );
  }

  if (!podCreated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1117] text-slate-300 p-4">
        <div className="p-8 rounded-2xl bg-[#161b22] border border-slate-700/80 text-center max-w-md w-full shadow-2xl relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 animate-pulse" />
          <div className="relative w-12 h-12 mx-auto mb-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <TerminalIcon className="w-5 h-5 text-slate-300 absolute inset-0 m-auto" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Booting Cloud Sandbox</h3>
          <p className="text-slate-400 text-xs mb-4">
            Preparing your isolated Kubernetes environment and terminal
          </p>

          <div className="flex items-center gap-2.5 bg-[#0d1117] border border-slate-800 rounded-lg p-3 mb-4 text-left">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
            <span className="text-xs font-mono text-blue-300 flex-1 truncate">
              {podStatus}
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-500 bg-[#0d1117]/60 px-3 py-1.5 rounded-md truncate">
            workspace: {replId}
          </div>
        </div>
      </div>
    );
  }

  const showLeftPanel = viewMode === "split" || viewMode === "code";
  const showRightPanel = viewMode === "split" || viewMode === "preview" || viewMode === "terminal";
  const showPreview = viewMode === "split" || viewMode === "preview";
  const showTerminal = viewMode === "split" || viewMode === "terminal";

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117] select-none">
      {/* Full-viewport drag overlay to prevent iframe/Monaco pointer capture */}
      {isDraggingMain && <div className="fixed inset-0 z-50 select-none cursor-col-resize" />}
      {isDraggingRight && <div className="fixed inset-0 z-50 select-none cursor-row-resize" />}

      {/* Top Navigation Bar */}
      <header className="h-12 bg-[#161b22] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 select-none z-30">
        <div className="flex items-center gap-3">
          <button onClick={handleCloseProject} disabled={isStopping} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-50" title="Save & Back to Home">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Vessel" className="w-5 h-5 object-contain" />
            <span className="font-semibold text-sm text-white tracking-wide">Vessel</span>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
              {replId}
            </span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-[#0d1117] border border-slate-800 p-0.5 rounded-lg">
          {([
            { mode: "split", icon: <Columns className="w-3.5 h-3.5" />, label: "Split", title: "Split View" },
            { mode: "code", icon: <Code2 className="w-3.5 h-3.5" />, label: "Code", title: "Code Only" },
            { mode: "preview", icon: <Globe className="w-3.5 h-3.5" />, label: "Preview", title: "Preview Only" },
            { mode: "terminal", icon: <TerminalIcon className="w-3.5 h-3.5" />, label: "Terminal", title: "Terminal Only" },
          ] as { mode: ViewMode; icon: React.ReactNode; label: string; title: string }[]).map(({ mode, icon, label, title }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={title}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                viewMode === mode
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Pod Active</span>
          </div>

          <button
            onClick={handleCloseProject}
            disabled={isStopping}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-md text-xs font-medium transition cursor-pointer disabled:opacity-50"
            title="Save workspace files to S3 and terminate the pod to free cluster resources"
          >
            {isStopping ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Square className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isStopping ? "Saving & Closing..." : "Save & Close"}</span>
          </button>
        </div>
      </header>

      {/* Stopping Overlay */}
      {isStopping && (
        <div className="fixed inset-0 z-50 bg-[#0d1117]/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="p-8 rounded-2xl bg-[#161b22] border border-slate-700/80 max-w-sm w-full text-center shadow-2xl">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Closing Project Workspace</h3>
            <p className="text-slate-300 text-xs mb-4 leading-relaxed">{stopMessage}</p>
            <div className="text-[11px] font-mono text-slate-400 bg-[#0d1117] border border-slate-800 px-3 py-1.5 rounded-md truncate">
              replId: {replId}
            </div>
          </div>
        </div>
      )}

      {/* Main Draggable Workspace */}
      <main ref={workspaceRef} className="flex-1 flex overflow-hidden w-full">
        {/* Left Panel: File Explorer + Monaco Editor */}
        <section
          style={{
            width: viewMode === "split" ? `calc(${mainSplit}% - 4px)` : viewMode === "code" ? "100%" : "0%",
            display: showLeftPanel ? "flex" : "none",
          }}
          className="flex-col min-w-0 h-full overflow-hidden shrink-0"
        >
          <Editor
            files={fileStructure}
            onSelect={onSelect}
            selectedFile={selectedFile}
            socket={socket}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onRefresh={handleRefresh}
          />
        </section>

        {/* Main Vertical Divider */}
        {viewMode === "split" && (
          <div
            onMouseDown={(e) => { e.preventDefault(); setIsDraggingMain(true); }}
            onDoubleClick={() => setMainSplit(50)}
            title="Drag to resize (Double-click to reset 50/50)"
            className={`w-2 h-full cursor-col-resize relative z-20 flex-shrink-0 transition-colors duration-150 group flex items-center justify-center select-none ${
              isDraggingMain ? "bg-blue-600/30" : "bg-[#161b22] hover:bg-blue-500/20"
            }`}
          >
            <div className={`w-[1px] h-full transition-colors ${isDraggingMain ? "bg-blue-500" : "bg-slate-800 group-hover:bg-blue-400"}`} />
            <div className={`absolute w-1 h-8 rounded-full transition-colors ${isDraggingMain ? "bg-blue-400 shadow-sm shadow-blue-500/50" : "bg-slate-700/80 group-hover:bg-blue-400"}`} />
          </div>
        )}

        {/* Right Panel: Preview (top) + Terminal (bottom) */}
        <section
          ref={rightPanelRef}
          style={{
            width: viewMode === "split" ? `calc(${100 - mainSplit}% - 4px)` : viewMode === "code" ? "0%" : "100%",
            display: showRightPanel ? "flex" : "none",
          }}
          className="flex-col min-w-0 h-full bg-[#0d1117] overflow-hidden shrink-0"
        >
          {/* Web Preview - always mounted for pre-load */}
          <div
            style={{
              height: viewMode === "split" ? `calc(${rightSplit}% - 4px)` : viewMode === "preview" ? "100%" : "0%",
              display: showPreview ? "flex" : "none",
            }}
            className="flex-col w-full overflow-hidden shrink-0 min-h-0"
          >
            <Output replId={replId} />
          </div>

          {/* Horizontal Divider (Preview <-> Terminal) */}
          {viewMode === "split" && (
            <div
              onMouseDown={(e) => { e.preventDefault(); setIsDraggingRight(true); }}
              onDoubleClick={() => setRightSplit(50)}
              title="Drag to resize Preview vs Terminal (Double-click to reset)"
              className={`h-2 w-full cursor-row-resize relative z-20 flex-shrink-0 transition-colors duration-150 group flex items-center justify-center select-none ${
                isDraggingRight ? "bg-blue-600/30" : "bg-[#161b22] hover:bg-blue-500/20"
              }`}
            >
              <div className={`h-[1px] w-full transition-colors ${isDraggingRight ? "bg-blue-500" : "bg-slate-800 group-hover:bg-blue-400"}`} />
              <div className={`absolute h-1 w-8 rounded-full transition-colors ${isDraggingRight ? "bg-blue-400 shadow-sm shadow-blue-500/50" : "bg-slate-700/80 group-hover:bg-blue-400"}`} />
            </div>
          )}

          {/* Interactive Terminal */}
          <div
            style={{
              height: viewMode === "split" ? `calc(${100 - rightSplit}% - 4px)` : viewMode === "terminal" ? "100%" : "0%",
              display: showTerminal ? "flex" : "none",
            }}
            className="flex-col w-full overflow-hidden shrink-0 min-h-0"
          >
            <TerminalComponent socket={socket} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CodingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <WorkspaceInner />
    </Suspense>
  );
}





