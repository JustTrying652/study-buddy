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
  titleFromMessages,
} from "@/lib/sessions";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
      const title = titleFromMessages(messages);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages, title: title ?? s.title, updatedAt: Date.now() }
            : s
        )
      );
      updateSessionMessages(activeSessionId, messages, title ?? "New chat");
    },
    [activeSessionId]
  );

  async function handleNew() {
    const fresh = await createSession();
    if (!fresh) return;
    setSessions((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setSidebarOpen(false);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
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
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    </div>
  );
}