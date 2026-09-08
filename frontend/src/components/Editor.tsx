"use client";

import { useEffect, useMemo } from "react";
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
}: {
  files: RemoteFile[];
  onSelect: (file: File) => void;
  selectedFile: File | undefined;
  socket: Socket | null;
  onCreateFile?: (name: string) => void;
  onCreateFolder?: (name: string) => void;
  onRefresh?: () => void;
}) => {
  const rootDir = useMemo(() => {
    return buildFileTree(files);
  }, [files]);

  useEffect(() => {
    if (!selectedFile && rootDir.files.length > 0) {
      onSelect(rootDir.files[0]);
    }
  }, [selectedFile, rootDir, onSelect]);

  const isEmpty = rootDir.files.length === 0 && rootDir.dirs.length === 0;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d1117]">
      <Sidebar
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
      <Code socket={socket} selectedFile={selectedFile} />
    </div>
  );
};

export default Editor;