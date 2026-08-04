import type { UIMessage } from "ai";
import { createClient } from "@/lib/supabase/client";

export type StudySession = {
  id: string;
  title: string;
  messages: UIMessage[];
  updatedAt: number;
};

type SessionRow = {
  id: string;
  title: string;
  messages: unknown;
  updated_at: string;
};

function rowToSession(row: SessionRow): StudySession {
  return {
    id: row.id,
    title: row.title,
    messages: Array.isArray(row.messages) ? (row.messages as UIMessage[]) : [],
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function loadSessions(): Promise<StudySession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("id, title, messages, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Could not load study sessions", error);
    return [];
  }
  return (data ?? []).map(rowToSession);
}

export async function createSession(): Promise<StudySession | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({ user_id: user.id, title: "New chat", messages: [] })
    .select("id, title, messages, updated_at")
    .single();

  if (error || !data) {
    console.error("Could not create session", error);
    return null;
  }
  return rowToSession(data);
}

export async function updateSessionMessages(
  id: string,
  messages: UIMessage[],
  title: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("study_sessions")
    .update({ messages, title, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Could not save session", error);
  }
}

export async function deleteSession(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("study_sessions").delete().eq("id", id);
  if (error) {
    console.error("Could not delete session", error);
  }
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