import React from "react";

// Modern icons from Heroicons (SVG)
const MenuIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5" />
  </svg>
);
const CloseIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  onNewChat: () => void;
};

export default function Sidebar({ collapsed, onToggle, onNewChat }: SidebarProps) {
  return (
    <aside className={`fixed left-0 top-0 bottom-0 transition-all duration-300 bg-gradient-to-b from-pink-100/80 via-blue-100/70 to-yellow-100/80 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col p-4 gap-4 z-20 h-full ${collapsed ? 'w-16' : 'w-64'}`}>
      <button
        onClick={onToggle}
        className="mb-4 w-8 h-8 flex items-center justify-center bg-[var(--background)] border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-300/40 dark:hover:bg-gray-700/40 transition-colors self-end"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? MenuIcon : CloseIcon}
      </button>
      {!collapsed && (
        <>
          <button
            onClick={onNewChat}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded-lg shadow mb-2 transition-colors"
          >
            + New Chat
          </button>
          <div className="text-gray-400 text-sm text-center mt-4">No chat history yet</div>
        </>
      )}
    </aside>
  );
}
