"use client";

import React, { ReactNode } from "react";

export const Sidebar = ({ children }: { children: ReactNode }) => {
  return (
    <aside className="w-64 h-full min-h-screen border-r border-slate-800 bg-[#161b22] overflow-y-auto pt-2 select-none text-slate-300">
      <div className="px-4 py-1 text-[11px] font-bold tracking-wider uppercase text-slate-500 mb-2">
        Explorer
      </div>
      {children}
    </aside>
  );
};

export default Sidebar;
