"use client";

import React, { ReactNode, useState, useRef, useEffect } from "react";
import { FilePlus, FolderPlus, RotateCw, Check, X, FileCode, Folder, FolderGit2 } from "lucide-react";

interface SidebarProps {
  children: ReactNode;
  width?: number;
  onCreateFile?: (name: string) => void;
  onCreateFolder?: (name: string) => void;
  onRefresh?: () => void;
  isEmpty?: boolean;
}

export const Sidebar = ({
  children,
  width,
  onCreateFile,
  onCreateFolder,
  onRefresh,
  isEmpty = false,
}: SidebarProps) => {
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatingFile || isCreatingFolder) {
      inputRef.current?.focus();
    }
  }, [isCreatingFile, isCreatingFolder]);

  const handleConfirm = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      handleCancel();
      return;
    }

    if (isCreatingFile && onCreateFile) {
      onCreateFile(trimmed);
    } else if (isCreatingFolder && onCreateFolder) {
      onCreateFolder(trimmed);
    }

    handleCancel();
  };

  const handleCancel = () => {
    setIsCreatingFile(false);
    setIsCreatingFolder(false);
    setNameInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const triggerRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <aside
      style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : undefined}
      className={`${width ? "" : "w-64"} h-full border-r border-slate-800 bg-[#161b22] overflow-y-auto select-none text-slate-300 flex flex-col shrink-0`}
    >
      {/* Explorer Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-[#0d1117]/60">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsCreatingFile(true);
              setIsCreatingFolder(false);
              setNameInput("");
            }}
            title="New File"
            className={`p-1 rounded transition text-slate-400 hover:text-white hover:bg-slate-800 ${
              isCreatingFile ? "bg-blue-600/30 text-blue-300" : ""
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setIsCreatingFolder(true);
              setIsCreatingFile(false);
              setNameInput("");
            }}
            title="New Folder"
            className={`p-1 rounded transition text-slate-400 hover:text-white hover:bg-slate-800 ${
              isCreatingFolder ? "bg-blue-600/30 text-blue-300" : ""
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={triggerRefresh}
            title="Refresh Explorer"
            className="p-1 rounded transition text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Inline New File / Folder Input */}
      {(isCreatingFile || isCreatingFolder) && (
        <div className="px-2 py-1.5 bg-[#0d1117] border-b border-slate-800 flex items-center gap-1.5 animate-fadeIn">
          {isCreatingFile ? (
            <FileCode className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
          ) : (
            <Folder className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCreatingFile ? "filename.js" : "folder-name"}
            className="flex-1 bg-[#161b22] border border-blue-500/60 rounded px-1.5 py-0.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={handleConfirm}
            title="Create"
            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCancel}
            title="Cancel"
            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* File Tree or Empty State */}
      <div className="flex-1 overflow-y-auto pt-1">
        {children}

        {isEmpty && !isCreatingFile && !isCreatingFolder && (
          <div className="px-4 py-8 text-center flex flex-col items-center justify-center text-slate-500">
            <FolderGit2 className="w-8 h-8 mb-2 opacity-30 text-slate-400" />
            <p className="text-xs mb-3 text-slate-400">No files in workspace</p>
            <button
              onClick={() => {
                setIsCreatingFile(true);
                setNameInput("");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-xs font-medium transition"
            >
              <FilePlus className="w-3.5 h-3.5" /> New File
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
