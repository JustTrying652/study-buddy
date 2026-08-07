"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { StudySession } from "@/lib/sessions";

export function Sidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  open,
  onClose,
  userEmail,
  onSignOut,
}: {
  sessions: StudySession[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  open: boolean;
  onClose: () => void;
  userEmail: string | null;
  onSignOut: () => void;
}) {
  const ordered = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  function startEditing(session: StudySession) {
    setEditingId(session.id);
    setEditingValue(session.title);
  }

  function commitEdit() {
    if (editingId) onRename(editingId, editingValue);
    setEditingId(null);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col overflow-hidden border-[var(--paper-line)] bg-[var(--card-bg)] transition-all duration-200 sm:static sm:z-0 sm:translate-x-0 ${
          open
            ? "w-64 translate-x-0 border-r"
            : "w-64 -translate-x-full sm:w-0 sm:border-r-0"
        }`}
      >
        {/* Fixed-width inner wrapper so content doesn't reflow while the
            outer width animates open/closed on desktop. */}
        <div className="flex h-full w-64 flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
              Sessions
            </span>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-[var(--ink-soft)] hover:bg-black/[0.05] hover:text-[var(--ink)]"
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

          <div className="px-3 pb-1">
            <Link
              href="/review"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:bg-black/[0.04] hover:text-[var(--accent)]"
            >
              <span aria-hidden="true">🗂️</span> Review flashcards
            </Link>
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
                onClick={() => {
                  if (editingId !== session.id) onSelect(session.id);
                }}
                onDoubleClick={() => startEditing(session)}
              >
                {editingId === session.id ? (
                  <input
                    ref={editInputRef}
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitEdit();
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    className="flex-1 min-w-0 rounded border border-[var(--accent)] bg-[var(--paper)] px-1.5 py-0.5 text-sm text-[var(--ink)] outline-none"
                  />
                ) : (
                  <span className="flex-1 truncate">{session.title}</span>
                )}

                {editingId !== session.id && (
                  <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(session);
                      }}
                      className="rounded p-1 text-[var(--ink-soft)] hover:bg-black/[0.06] hover:text-[var(--accent)]"
                      aria-label={`Rename "${session.title}"`}
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(session.id);
                      }}
                      className="rounded p-1 text-[var(--ink-soft)] hover:bg-black/[0.06] hover:text-red-600"
                      aria-label={`Delete "${session.title}"`}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {userEmail && (
            <div className="flex items-center justify-between gap-2 border-t border-[var(--paper-line)] px-3 py-3">
              <span className="min-w-0 truncate text-xs text-[var(--ink-soft)]" title={userEmail}>
                {userEmail}
              </span>
              <button
                onClick={onSignOut}
                className="shrink-0 text-xs font-medium text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--accent)]"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}