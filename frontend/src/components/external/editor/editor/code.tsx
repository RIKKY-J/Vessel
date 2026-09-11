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
      <div className="flex-1 flex flex-col items-center justify-center bg-[#092328] text-[#8BBB92]/60 select-none">
        <Code2 className="w-12 h-12 mb-3 opacity-30 text-[#8BBB92]" />
        <p className="text-sm">Select a file from the explorer to begin editing</p>
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
    monaco.editor.defineTheme("vessel-forest", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "628c6e", fontStyle: "italic" },
        { token: "keyword", foreground: "8BBB92", fontStyle: "bold" },
        { token: "string", foreground: "a6d9ab" },
        { token: "number", foreground: "80dfa2" },
        { token: "type", foreground: "8BBB92" },
        { token: "function", foreground: "b5e8bd" },
        { token: "variable", foreground: "e6edf3" },
      ],
      colors: {
        "editor.background": "#092328",
        "editor.foreground": "#e6edf3",
        "editor.lineHighlightBackground": "#12544F22",
        "editorLineNumber.foreground": "#12544F",
        "editorLineNumber.activeForeground": "#8BBB92",
        "editorCursor.foreground": "#8BBB92",
        "editor.selectionBackground": "#2A835F55",
        "editorIndentGuide.background": "#12544F33",
        "editorIndentGuide.activeBackground": "#2A835F88",
        "editorGutter.background": "#092328",
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
    <div className="flex-1 flex flex-col h-full bg-[#092328] overflow-hidden">
      {/* File Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#12544F]/20 border-b border-[#12544F] text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2 truncate">
          <span className="text-[#8BBB92] font-semibold">{selectedFile.name}</span>
          <span className="text-[#8BBB92]/60 text-[11px] truncate">({selectedFile.path})</span>
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
                <span className="w-2 h-2 rounded-full bg-[#8BBB92]" />
                <span className="text-[#8BBB92] font-medium">Sandbox Synced (Live)</span>
              </>
            )}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#12544F]/50 text-[#8BBB92] border border-[#12544F] text-[10px] uppercase font-sans">
            {language}
          </span>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 relative bg-[#092328]">
        <Editor
          key={selectedFile.path}
          path={selectedFile.path}
          height="100%"
          language={language}
          value={code}
          beforeMount={handleEditorWillMount}
          theme="vessel-forest"
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
