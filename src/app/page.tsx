"use client";

import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { Sidebar } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
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

  // Load everything once, client-side only, after the first paint —
  // avoids an SSR/client markup mismatch since localStorage doesn't
  // exist on the server. This one-time hydration read is a legitimate
  // exception to the "don't setState in an effect" rule below.
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

  function handleMessagesChange(sessionId: string, messages: UIMessage[]) {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessionId
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
  }

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

  if (!mounted) {
    // Matches what a brand-new visitor sees, so there's nothing for
    // hydration to mismatch against once localStorage kicks in above.
    return <div className="flex h-screen" />;
  }

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const handleActiveMessagesChange = useCallback(
    (messages: UIMessage[]) => handleMessagesChange(activeSession.id, messages),
    [activeSession.id]
  );

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