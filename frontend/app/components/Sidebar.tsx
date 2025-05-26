import React, { useEffect, useState } from "react";

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
  onSelectSession?: (sessionId: string) => void;
};

type ChatSession = {
  Id: string;
  Summary: string;
  CreatedAt: string;
  IsFavourite?: boolean;
};

function groupSessions(sessions: ChatSession[]) {
  const now = new Date();
  const today: ChatSession[] = [];
  const past7: ChatSession[] = [];
  const past30: ChatSession[] = [];
  const older: ChatSession[] = [];
  sessions.forEach(s => {
    const created = new Date(s.CreatedAt);
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 1 && now.getDate() === created.getDate()) {
      today.push(s);
    } else if (diffDays < 7) {
      past7.push(s);
    } else if (diffDays < 30) {
      past30.push(s);
    } else {
      older.push(s);
    }
  });
  return { today, past7, past30, older };
}

export default function Sidebar({ collapsed, onToggle, onNewChat, onSelectSession }: SidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [favourites, setFavourites] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    if (!collapsed) {
      fetch("/api/chat/sessions")
        .then(res => res.json())
        .then(data => {
          setSessions(data);
          const favs: { [id: string]: boolean } = {};
          data.forEach((s: ChatSession) => { if (s.IsFavourite) favs[s.Id] = true; });
          setFavourites(favs);
        });
    }
  }, [collapsed]);

  const handleSelect = (id: string) => {
    if (onSelectSession) onSelectSession(id);
  };

  const handleToggleFavourite = async (id: string) => {
    const isFav = !favourites[id];
    setFavourites(f => ({ ...f, [id]: isFav }));
    await fetch(`/api/chat/session/${id}/favourite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavourite: isFav })
    });
  };

  const grouped = groupSessions(sessions);

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
          <div className="flex-1 overflow-y-auto mt-4">
            {sessions.length === 0 && <div className="text-gray-400 text-sm text-center">No chat history yet</div>}
            {sessions.length > 0 && (
              <>
                {grouped.today.length > 0 && <div className="font-bold text-xs mt-2 mb-1">Today</div>}
                {grouped.today.map(s => (
                  <div key={s.Id} className="flex items-center group">
                    <div
                      className="truncate text-sm py-1 px-2 rounded hover:bg-pink-100 cursor-pointer flex-1"
                      onClick={() => handleSelect(s.Id)}
                    >
                      {s.Summary}
                    </div>
                    <button
                      className={`ml-1 text-yellow-400 hover:text-yellow-600 ${favourites[s.Id] ? '' : 'opacity-30 group-hover:opacity-100'}`}
                      onClick={e => { e.stopPropagation(); handleToggleFavourite(s.Id); }}
                      title={favourites[s.Id] ? 'Unmark favourite' : 'Mark as favourite'}
                    >
                      ★
                    </button>
                  </div>
                ))}
                {grouped.past7.length > 0 && <div className="font-bold text-xs mt-2 mb-1">Past 7 Days</div>}
                {grouped.past7.map(s => (
                  <div key={s.Id} className="flex items-center group">
                    <div
                      className="truncate text-sm py-1 px-2 rounded hover:bg-blue-100 cursor-pointer flex-1"
                      onClick={() => handleSelect(s.Id)}
                    >
                      {s.Summary}
                    </div>
                    <button
                      className={`ml-1 text-yellow-400 hover:text-yellow-600 ${favourites[s.Id] ? '' : 'opacity-30 group-hover:opacity-100'}`}
                      onClick={e => { e.stopPropagation(); handleToggleFavourite(s.Id); }}
                      title={favourites[s.Id] ? 'Unmark favourite' : 'Mark as favourite'}
                    >
                      ★
                    </button>
                  </div>
                ))}
                {grouped.past30.length > 0 && <div className="font-bold text-xs mt-2 mb-1">Previous 30 Days</div>}
                {grouped.past30.map(s => (
                  <div key={s.Id} className="flex items-center group">
                    <div
                      className="truncate text-sm py-1 px-2 rounded hover:bg-yellow-100 cursor-pointer flex-1"
                      onClick={() => handleSelect(s.Id)}
                    >
                      {s.Summary}
                    </div>
                    <button
                      className={`ml-1 text-yellow-400 hover:text-yellow-600 ${favourites[s.Id] ? '' : 'opacity-30 group-hover:opacity-100'}`}
                      onClick={e => { e.stopPropagation(); handleToggleFavourite(s.Id); }}
                      title={favourites[s.Id] ? 'Unmark favourite' : 'Mark as favourite'}
                    >
                      ★
                    </button>
                  </div>
                ))}
                {grouped.older.length > 0 && <div className="font-bold text-xs mt-2 mb-1">Older</div>}
                {grouped.older.map(s => (
                  <div key={s.Id} className="flex items-center group">
                    <div
                      className="truncate text-sm py-1 px-2 rounded hover:bg-gray-100 cursor-pointer flex-1"
                      onClick={() => handleSelect(s.Id)}
                    >
                      {s.Summary}
                    </div>
                    <button
                      className={`ml-1 text-yellow-400 hover:text-yellow-600 ${favourites[s.Id] ? '' : 'opacity-30 group-hover:opacity-100'}`}
                      onClick={e => { e.stopPropagation(); handleToggleFavourite(s.Id); }}
                      title={favourites[s.Id] ? 'Unmark favourite' : 'Mark as favourite'}
                    >
                      ★
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
