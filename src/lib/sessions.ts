import type { UIMessage } from "ai";

export type StudySession = {
  id: string;
  title: string;
  messages: UIMessage[];
  updatedAt: number;
};

const SESSIONS_KEY = "study-buddy:sessions-v2";
const ACTIVE_KEY = "study-buddy:active-session-v2";

export function loadSessions(): StudySession[] {
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Could not load study sessions", e);
    return [];
  }
}

export function saveSessions(sessions: StudySession[]) {
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Could not save study sessions", e);
  }
}

export function loadActiveId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveId(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch (e) {
    console.error("Could not save active session id", e);
  }
}

export function makeSession(): StudySession {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

// Derive a short title from the first user message once the chat has content.
export function titleFromMessages(messages: UIMessage[]): string | null {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return null;
  const text = firstUserMessage.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
  if (!text) return null;
  return text.length > 42 ? text.slice(0, 42).trimEnd() + "…" : text;
}