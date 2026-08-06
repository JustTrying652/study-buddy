"use client";

import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { Sidebar } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { createClient } from "@/lib/supabase/client";
import {
  type StudySession,
  loadSessions,
  createSession,
  updateSessionMessages,
  deleteSession,
  renameSession,
  titleFromMessages,
} from "@/lib/sessions";

// Keep in sync with Tailwind's default `sm` breakpoint (640px) used
// throughout the sidebar's responsive classes.
function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  // Defaults to open (matches desktop, where the sidebar is normally
  // visible); a mount-time effect below closes it if we're actually on
  // a small screen, so it doesn't cover the chat on first load there.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount check, not reacting to changing state */
    if (isMobileViewport()) setSidebarOpen(false);
  }, []);

  // Sessions are proxy-gated, so a user always exists here — this just
  // fetches the email for display and wires up sign-out.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Load the user's sessions from the database once, on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await loadSessions();
      if (cancelled) return;

      if (stored.length === 0) {
        const fresh = await createSession();
        if (cancelled) return;
        if (fresh) {
          setSessions([fresh]);
          setActiveId(fresh.id);
        }
      } else {
        setSessions(stored);
        setActiveId(stored[0].id);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const activeSessionId = activeSession?.id ?? "";

  const handleActiveMessagesChange = useCallback(
    (messages: UIMessage[]) => {
      setSessions((prev) => {
        const next = prev.map((s) => {
          if (s.id !== activeSessionId) return s;
          // Respect a manual rename — don't let the auto-title-from-first-
          // message logic silently overwrite it on the next reply.
          const title = s.titleIsCustom ? s.title : (titleFromMessages(messages) ?? s.title);
          return { ...s, messages, title, updatedAt: Date.now() };
        });

        const updated = next.find((s) => s.id === activeSessionId);
        if (updated) {
          updateSessionMessages(activeSessionId, messages, updated.title);
        }
        return next;
      });
    },
    [activeSessionId]
  );

  async function handleNew() {
    const fresh = await createSession();
    if (!fresh) return;
    setSessions((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    if (isMobileViewport()) setSidebarOpen(false);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    if (isMobileViewport()) setSidebarOpen(false);
  }

  async function handleDelete(id: string) {
    const remaining = sessions.filter((s) => s.id !== id);

    if (remaining.length === 0) {
      const fresh = await createSession();
      setSessions(fresh ? [fresh] : []);
      if (fresh) setActiveId(fresh.id);
    } else {
      setSessions(remaining);
      if (id === activeId) setActiveId(remaining[0].id);
    }

    deleteSession(id);
  }

  function handleRename(id: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: trimmed, titleIsCustom: true } : s)));
    renameSession(id, trimmed);
  }

  if (loading || !activeSession) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-[var(--ink-soft)]">Loading your notebook…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        sessions={sessions}
        activeId={activeSession.id}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        onRename={handleRename}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      />
      <ChatPanel
        key={activeSession.id}
        sessionId={activeSession.id}
        initialMessages={activeSession.messages}
        onMessagesChange={handleActiveMessagesChange}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
    </div>
  );
}