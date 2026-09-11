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
      className={`${width ? "" : "w-64"} h-full border-r border-[#232936] bg-[#12151B] overflow-y-auto select-none text-slate-300 flex flex-col shrink-0`}
    >
      {/* Explorer Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#232936] bg-[#12151B]">
        <span className="text-[11px] font-bold tracking-wider uppercase text-white">
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
            className={`p-1 rounded transition text-slate-400 hover:text-white hover:bg-[#181C24] cursor-pointer ${
              isCreatingFile ? "bg-[#181C24] text-[#E73F1E]" : ""
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
            className={`p-1 rounded transition text-slate-400 hover:text-white hover:bg-[#181C24] cursor-pointer ${
              isCreatingFolder ? "bg-[#181C24] text-[#E73F1E]" : ""
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={triggerRefresh}
            title="Refresh Explorer"
            className="p-1 rounded transition text-slate-400 hover:text-white hover:bg-[#181C24] cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#E73F1E]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Inline New File / Folder Input */}
      {(isCreatingFile || isCreatingFolder) && (
        <div className="px-2 py-1.5 bg-[#181C24] border-b border-[#232936] flex items-center gap-1.5 animate-fadeIn">
          {isCreatingFile ? (
            <FileCode className="w-4 h-4 text-[#E73F1E] shrink-0 ml-1" />
          ) : (
            <Folder className="w-4 h-4 text-[#E73F1E] shrink-0 ml-1" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCreatingFile ? "filename.js" : "folder-name"}
            className="flex-1 bg-[#0B0D11] border border-[#232936] rounded px-1.5 py-0.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E73F1E]"
          />
          <button
            onClick={handleConfirm}
            title="Create"
            className="p-1 text-emerald-400 hover:text-emerald-300 rounded cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCancel}
            title="Cancel"
            className="p-1 text-rose-400 hover:text-rose-300 rounded cursor-pointer"
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
            <FolderGit2 className="w-8 h-8 mb-2 opacity-50 text-[#E73F1E]" />
            <p className="text-xs mb-3 text-slate-400">No files in workspace</p>
            <button
              onClick={() => {
                setIsCreatingFile(true);
                setNameInput("");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E73F1E]/15 hover:bg-[#E73F1E]/25 text-white border border-[#E73F1E]/40 rounded text-xs font-semibold transition cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5 text-[#E73F1E]" /> New File
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
