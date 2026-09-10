"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { File } from "../utils/file-manager";
import { Socket } from "socket.io-client";
import { Code2, Check, Cloud } from "lucide-react";
import axios from "axios";

export const Code = ({
  selectedFile,
  socket,
  replId,
}: {
  selectedFile: File | undefined;
  socket: Socket | null;
  replId?: string;
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

  const handleChange = (value: string | undefined) => {
    const val = value ?? "";
    const activeFile = currentFileRef.current;
    if (!activeFile) return;

    // Update in-memory file content
    activeFile.content = val;

    // Clear existing debounce timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // 1. Sync with live pod container
      if (socket && socket.connected) {
        socket.emit("updateContent", { path: activeFile.path, content: val });
      }

      // 2. Persist directly to S3
      if (replId) {
        axios.post("/api/file/save", {
          replId,
          path: activeFile.path,
          content: val,
        }).catch((err) => {
          console.warn("[Editor] Failed to auto-save to S3:", err);
        });
      }
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#092328] overflow-hidden">
      {/* File Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#12544F]/20 border-b border-[#12544F] text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2 truncate">
          <span className="text-[#8BBB92] font-semibold">{selectedFile.name}</span>
          <span className="text-[#8BBB92]/60 text-[11px] truncate">({selectedFile.path})</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 select-none">
          <span className="flex items-center gap-1 text-[#8BBB92]/80">
            <Cloud className="w-3 h-3 text-[#8BBB92]" />
            <span>Auto-saving to S3</span>
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
