"use client";

import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { Sidebar } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { createClient } from "@/lib/supabase/client";
import {
  type StudySession,
  loadSessions,
  saveSessions,
  loadActiveId,
  saveActiveId,
  makeSession,
  titleFromMessages,
} from "@/lib/sessions";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const stored = loadSessions();
    const storedActive = loadActiveId();

    if (stored.length === 0) {
      const first = makeSession();
      setSessions([first]);
      setActiveId(first.id);
      saveSessions([first]);
      saveActiveId(first.id);
    } else {
      setSessions(stored);
      const validActive = stored.some((s) => s.id === storedActive);
      setActiveId(validActive ? storedActive! : stored[0].id);
    }
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const activeSessionId = activeSession?.id ?? "";

  const handleActiveMessagesChange = useCallback(
    (messages: UIMessage[]) => {
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages,
                title: titleFromMessages(messages) ?? s.title,
                updatedAt: Date.now(),
              }
            : s
        );
        saveSessions(next);
        return next;
      });
    },
    [activeSessionId]
  );

  function handleNew() {
    const fresh = makeSession();
    setSessions((prev) => {
      const next = [fresh, ...prev];
      saveSessions(next);
      return next;
    });
    setActiveId(fresh.id);
    saveActiveId(fresh.id);
    setSidebarOpen(false);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    saveActiveId(id);
    setSidebarOpen(false);
  }

  function handleDelete(id: string) {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      const finalList = next.length > 0 ? next : [makeSession()];
      saveSessions(finalList);

      if (id === activeId) {
        const nextActive = finalList[0].id;
        setActiveId(nextActive);
        saveActiveId(nextActive);
      }
      return finalList;
    });
  }

  if (!mounted || !activeSession) {
    return <div className="flex h-screen" />;
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