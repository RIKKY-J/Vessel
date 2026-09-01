"use client";

import React, { useState } from "react";
import { Directory, File, sortDir, sortFile } from "../utils/file-manager";
import { getIcon } from "./icon";

interface FileTreeProps {
  rootDir: Directory;
  selectedFile: File | undefined;
  onSelect: (file: File) => void;
}

export const FileTree = (props: FileTreeProps) => {
  return <SubTree directory={props.rootDir} {...props} />;
};

interface SubTreeProps {
  directory: Directory;
  selectedFile: File | undefined;
  onSelect: (file: File) => void;
}

const SubTree = (props: SubTreeProps) => {
  return (
    <div>
      {props.directory.dirs.sort(sortDir).map((dir) => (
        <React.Fragment key={dir.id}>
          <DirDiv
            directory={dir}
            selectedFile={props.selectedFile}
            onSelect={props.onSelect}
          />
        </React.Fragment>
      ))}
      {props.directory.files.sort(sortFile).map((file) => (
        <React.Fragment key={file.id}>
          <FileDiv
            file={file}
            selectedFile={props.selectedFile}
            onClick={() => props.onSelect(file)}
          />
        </React.Fragment>
      ))}
    </div>
  );
};

const FileDiv = ({
  file,
  icon,
  selectedFile,
  onClick,
}: {
  file: File | Directory;
  icon?: string;
  selectedFile: File | undefined;
  onClick: () => void;
}) => {
  const isSelected = selectedFile && selectedFile.id === file.id;
  const depth = file.depth;

  return (
    <div
      style={{ paddingLeft: `${depth * 14}px` }}
      className={`flex items-center py-1 px-2 cursor-pointer text-xs font-mono transition-colors rounded-sm mx-1 ${
        isSelected
          ? "bg-blue-600/20 text-blue-300 font-medium"
          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
      }`}
      onClick={onClick}
    >
      <span className="flex items-center justify-center w-5 h-5 mr-1.5 shrink-0">
        {getIcon(file.name.split(".").pop() || "", icon || "")}
      </span>
      <span className="truncate">{file.name}</span>
    </div>
  );
};

const DirDiv = ({
  directory,
  selectedFile,
  onSelect,
}: {
  directory: Directory;
  selectedFile: File | undefined;
  onSelect: (file: File) => void;
}) => {
  let defaultOpen = false;
  if (selectedFile) defaultOpen = isChildSelected(directory, selectedFile);
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <FileDiv
        file={directory}
        icon={open ? "openDirectory" : "closedDirectory"}
        selectedFile={selectedFile}
        onClick={() => {
          if (!open) {
            onSelect(directory as any);
          }
          setOpen(!open);
        }}
      />
      {open ? (
        <SubTree
          directory={directory}
          selectedFile={selectedFile}
          onSelect={onSelect}
        />
      ) : null}
    </>
  );
};

const isChildSelected = (directory: Directory, selectedFile: File): boolean => {
  let res = false;

  function isChild(dir: Directory, file: File) {
    if (selectedFile.parentId === dir.id) {
      res = true;
      return;
    }
    if (selectedFile.parentId === "0") {
      res = false;
      return;
    }
    dir.dirs.forEach((item) => {
      isChild(item, file);
    });
  }

  isChild(directory, selectedFile);
  return res;
};
