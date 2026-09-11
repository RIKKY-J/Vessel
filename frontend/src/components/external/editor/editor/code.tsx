"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { File } from "../utils/file-manager";
import { Socket } from "socket.io-client";
import { Code2, Check, Cloud } from "lucide-react";
import axios from "axios";

export const Code = ({
  selectedFile,
  socket,
  replId,
  onContentChange,
}: {
  selectedFile: File | undefined;
  socket: Socket | null;
  replId?: string;
  onContentChange?: (path: string, content: string) => void;
}) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentFileRef = useRef<File | undefined>(selectedFile);
  currentFileRef.current = selectedFile;

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!selectedFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0D11] text-slate-400 select-none">
        <Code2 className="w-12 h-12 mb-3 text-[#E73F1E] opacity-60" />
        <p className="text-sm text-slate-300">Select a file from the explorer to begin editing</p>
      </div>
    );
  }

  const code = selectedFile.content ?? "";
  let language = selectedFile.name.split(".").pop() || "plaintext";

  if (language === "js" || language === "jsx") language = "javascript";
  else if (language === "ts" || language === "tsx") language = "typescript";
  else if (language === "py") language = "python";
  else if (language === "json") language = "json";
  else if (language === "html") language = "html";
  else if (language === "css") language = "css";
  else if (language === "md") language = "markdown";
  else if (language === "sh") language = "shell";
  else if (language === "yaml" || language === "yml") language = "yaml";

  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme("vessel-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "E73F1E", fontStyle: "bold" },
        { token: "string", foreground: "e2e8f0" },
        { token: "number", foreground: "fdba74" },
        { token: "type", foreground: "cbd5e1" },
        { token: "function", foreground: "ffffff", fontStyle: "bold" },
        { token: "variable", foreground: "f8fafc" },
      ],
      colors: {
        "editor.background": "#0B0D11",
        "editor.foreground": "#f8fafc",
        "editor.lineHighlightBackground": "#181C24",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#E73F1E",
        "editorCursor.foreground": "#E73F1E",
        "editor.selectionBackground": "#E73F1E35",
        "editorIndentGuide.background": "#232936",
        "editorIndentGuide.activeBackground": "#475569",
        "editorGutter.background": "#0B0D11",
      },
    });
  };

  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "idle">("idle");

  const handleChange = (value: string | undefined) => {
    const val = value ?? "";
    const activeFile = currentFileRef.current;
    if (!activeFile) return;

    // Update in-memory file content
    activeFile.content = val;
    setSyncStatus("saving");

    // Notify parent state immediately for cache integrity
    if (onContentChange) {
      onContentChange(activeFile.path, val);
    }

    // Clear existing debounce timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // 1. If socket is connected, emit updateContent
      if (socket && socket.connected) {
        socket.emit("updateContent", { path: activeFile.path, content: val });
      }

      // 2. Write directly to the running container filesystem (/workspace)
      if (replId) {
        try {
          await axios.post("/api/file/write-pod", {
            replId,
            path: activeFile.path,
            content: val,
          });
          setSyncStatus("saved");

          // Dispatch event to automatically reload preview iframe
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("vessel:file-updated", {
                detail: { replId, path: activeFile.path },
              })
            );
          }
        } catch (err) {
          console.warn("[Editor] Container sync failed:", err);
          setSyncStatus("idle");
        }
      }
    }, 300);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0D11] overflow-hidden">
      {/* File Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#12151B] border-b border-[#232936] text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2 truncate">
          <span className="text-white font-semibold">{selectedFile.name}</span>
          <span className="text-slate-400 text-[11px] truncate">({selectedFile.path})</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 select-none">
          <span className="flex items-center gap-1.5 font-sans">
            {syncStatus === "saving" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-300 font-medium">Syncing to sandbox...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#E73F1E]" />
                <span className="text-white font-medium">Sandbox Synced (Live)</span>
              </>
            )}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#181C24] text-white border border-[#232936] text-[10px] uppercase font-sans">
            {language}
          </span>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 relative bg-[#0B0D11]">
        <Editor
          key={selectedFile.path}
          path={selectedFile.path}
          height="100%"
          language={language}
          value={code}
          beforeMount={handleEditorWillMount}
          theme="vessel-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
          }}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};
