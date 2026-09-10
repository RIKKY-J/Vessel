"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Sidebar from "./external/editor/components/sidebar";
import { Code } from "./external/editor/editor/code";
import { File, buildFileTree, RemoteFile } from "./external/editor/utils/file-manager";
import { FileTree } from "./external/editor/components/file-tree";
import { Socket } from "socket.io-client";

export const Editor = ({
  files,
  onSelect,
  selectedFile,
  socket,
  onCreateFile,
  onCreateFolder,
  onRefresh,
  replId,
}: {
  files: RemoteFile[];
  onSelect: (file: File) => void;
  selectedFile: File | undefined;
  socket: Socket | null;
  onCreateFile?: (name: string) => void;
  onCreateFolder?: (name: string) => void;
  onRefresh?: () => void;
  replId?: string;
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rootDir = useMemo(() => {
    return buildFileTree(files);
  }, [files]);

  useEffect(() => {
    if (!selectedFile && rootDir.files.length > 0) {
      onSelect(rootDir.files[0]);
    }
  }, [selectedFile, rootDir, onSelect]);

  useEffect(() => {
    if (!isDraggingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      if (newWidth >= 160 && newWidth <= 450) {
        setSidebarWidth(newWidth);
        window.dispatchEvent(new Event("resize"));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
      window.dispatchEvent(new Event("resize"));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSidebar]);

  const isEmpty = rootDir.files.length === 0 && rootDir.dirs.length === 0;

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden bg-[#092328] relative">
      {/* Drag overlay prevents iframe/Monaco pointer capture */}
      {isDraggingSidebar && (
        <div className="fixed inset-0 z-50 select-none cursor-col-resize" />
      )}

      <Sidebar
        width={sidebarWidth}
        onCreateFile={onCreateFile}
        onCreateFolder={onCreateFolder}
        onRefresh={onRefresh}
        isEmpty={isEmpty}
      >
        <FileTree
          rootDir={rootDir}
          selectedFile={selectedFile}
          onSelect={onSelect}
        />
      </Sidebar>

      {/* VS Code-style sidebar resizer handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDraggingSidebar(true);
        }}
        onDoubleClick={() => setSidebarWidth(240)}
        title="Drag to resize explorer (Double-click to reset)"
        className={`w-2 h-full cursor-col-resize relative z-20 flex-shrink-0 transition-colors duration-150 group flex items-center justify-center select-none ${
          isDraggingSidebar ? "bg-[#2A835F]/30" : "bg-[#092328] hover:bg-[#12544F]"
        }`}
      >
        <div
          className={`w-[1px] h-full transition-colors ${
            isDraggingSidebar ? "bg-[#2A835F]" : "bg-[#12544F] group-hover:bg-[#8BBB92]"
          }`}
        />
        <div
          className={`absolute w-1 h-8 rounded-full transition-colors ${
            isDraggingSidebar
              ? "bg-[#8BBB92] shadow-sm shadow-[#2A835F]/50"
              : "bg-[#12544F] group-hover:bg-[#8BBB92]"
          }`}
        />
      </div>

      <div className="flex-1 min-w-0 h-full overflow-hidden">
        <Code socket={socket} selectedFile={selectedFile} replId={replId} />
      </div>
    </div>
  );
};

export default Editor;
