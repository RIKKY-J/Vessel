"use client";

import Editor from "@monaco-editor/react";
import { File } from "../utils/file-manager";
import { Socket } from "socket.io-client";
import { Code2 } from "lucide-react";

export const Code = ({
  selectedFile,
  socket,
}: {
  selectedFile: File | undefined;
  socket: Socket | null;
}) => {
  if (!selectedFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1117] text-slate-500 select-none">
        <Code2 className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Select a file from the explorer to begin editing</p>
      </div>
    );
  }

  const code = selectedFile.content || "";
  let language = selectedFile.name.split(".").pop() || "plaintext";

  if (language === "js" || language === "jsx") language = "javascript";
  else if (language === "ts" || language === "tsx") language = "typescript";
  else if (language === "py") language = "python";
  else if (language === "json") language = "json";
  else if (language === "html") language = "html";
  else if (language === "css") language = "css";
  else if (language === "md") language = "markdown";

  function debounce(func: (value: string) => void, wait: number) {
    let timeout: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func(value);
      }, wait);
    };
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden">
      <div className="flex items-center px-4 py-2 bg-[#161b22] border-b border-slate-800 text-xs font-mono text-slate-300">
        <span className="truncate">{selectedFile.path}</span>
      </div>
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
          onChange={debounce((value) => {
            if (socket) {
              socket.emit("updateContent", { path: selectedFile.path, content: value });
            }
          }, 500)}
        />
      </div>
    </div>
  );
};
