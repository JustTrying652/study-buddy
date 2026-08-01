"use client";

import type { StudySession } from "@/lib/sessions";

export function Sidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDelete,
  open,
  onClose,
}: {
  sessions: StudySession[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  const ordered = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      {/* mobile scrim, only visible when the sidebar is open as an overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[var(--paper-line)] bg-[var(--card-bg)] transition-transform sm:static sm:z-0 sm:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
            Sessions
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--ink-soft)] hover:bg-black/[0.05] hover:text-[var(--ink)] sm:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <div className="px-3 pb-1">
          <button
            onClick={onNew}
            className="w-full rounded-lg border border-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
          >
            + New chat
          </button>
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
          {ordered.length === 0 && (
            <p className="px-2 py-3 text-xs text-[var(--ink-soft)]">
              Your chats will show up here.
            </p>
          )}
          {ordered.map((session) => (
            <div
              key={session.id}
              className={`group mb-1 flex items-center gap-1 rounded-lg px-2 py-2 text-sm cursor-pointer ${
                session.id === activeId
                  ? "bg-[var(--accent-soft)]/50 text-[var(--ink)]"
                  : "text-[var(--ink-soft)] hover:bg-black/[0.04]"
              }`}
              onClick={() => onSelect(session.id)}
            >
              <span className="flex-1 truncate">{session.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.id);
                }}
                className="hidden shrink-0 text-[var(--ink-soft)] hover:text-red-600 group-hover:block"
                aria-label={`Delete "${session.title}"`}
              >
                ✕
              </button>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}