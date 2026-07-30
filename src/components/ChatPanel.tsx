"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import type { UIMessage } from "ai";
import { Markdown } from "@/components/Markdown";

type FlashcardOutput = { front: string; back: string };
type QuizOutput = { question: string; options: string[]; correctIndex: number };

function Flashcard({ data }: { data: FlashcardOutput }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      className="msg-enter -rotate-1 rounded-sm bg-[var(--highlight)] p-4 text-left text-[var(--ink)] shadow-md max-w-sm border border-black/5"
    >
      <p className="font-mono-note text-[11px] uppercase tracking-wide text-[var(--ink-soft)] mb-1">
        {flipped ? "answer" : "term · tap to flip"}
      </p>
      <p className="font-hand text-2xl leading-snug">{flipped ? data.back : data.front}</p>
    </button>
  );
}

function QuizCard({ data }: { data: QuizOutput }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="msg-enter rotate-1 rounded-sm bg-[var(--mint)]/20 border border-[var(--mint)] p-4 max-w-sm">
      <p className="font-hand text-2xl leading-none mb-2 text-[#3d5c47]">Pop quiz</p>
      <p className="text-sm mb-3 text-[var(--ink)]">{data.question}</p>
      <div className="flex flex-col gap-1.5">
        {data.options.map((opt, i) => {
          const showState = picked !== null;
          const isCorrect = i === data.correctIndex;
          const isPicked = picked === i;
          return (
            <button
              key={i}
              disabled={showState}
              onClick={() => setPicked(i)}
              className={`text-left text-sm px-3 py-1.5 rounded border transition-colors ${
                showState && isCorrect
                  ? "bg-white border-[#3d5c47]"
                  : showState && isPicked
                    ? "bg-red-50 border-red-400"
                    : "border-black/10 hover:bg-white/60"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className="mt-2 text-xs font-mono-note text-[var(--ink-soft)]">
          {picked === data.correctIndex ? "correct." : "not quite — the highlighted one was it."}
        </p>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`msg-enter flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div
                key={i}
                className={`rounded-2xl px-4 py-2.5 ${
                  isUser
                    ? "bg-[var(--accent)] text-white rounded-br-sm text-[15px] leading-relaxed whitespace-pre-wrap"
                    : "bg-[var(--card-bg)] text-[var(--ink)] rounded-bl-sm border border-[var(--paper-line)]"
                }`}
              >
                {isUser ? part.text : <Markdown text={part.text} />}
              </div>
            );
          }

          if (part.type === "tool-flashcard" && part.state === "output-available") {
            return <Flashcard key={i} data={part.output as FlashcardOutput} />;
          }

          if (part.type === "tool-quiz" && part.state === "output-available") {
            return <QuizCard key={i} data={part.output as QuizOutput} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}

export function ChatPanel({
  sessionId,
  initialMessages,
  onMessagesChange,
  onOpenSidebar,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
  onMessagesChange: (messages: UIMessage[]) => void;
  onOpenSidebar: () => void;
}) {
  const { messages, sendMessage, status, error, clearError, regenerate } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onMessagesChange(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="flex h-screen flex-1 flex-col min-w-0">
      <header className="flex items-center gap-3 border-b border-[var(--paper-line)] px-4 py-3 sm:px-6 sm:py-4">
        <button
          onClick={onOpenSidebar}
          className="text-[var(--ink-soft)] hover:text-[var(--ink)] sm:hidden"
          aria-label="Open sessions"
        >
          ☰
        </button>
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="font-hand text-3xl sm:text-4xl text-[var(--accent)] shrink-0">
            Study Buddy
          </h1>
          <p className="hidden text-sm text-[var(--ink-soft)] font-mono-note truncate sm:block">
            explains · quizzes · remembers where you left off
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="text-center py-16 sm:py-20">
              <p className="font-hand text-3xl text-[var(--accent)] mb-2">
                Fresh page. What are we studying?
              </p>
              <p className="text-sm text-[var(--ink-soft)]">
                Paste your notes, ask for a concept to be explained, or say &ldquo;quiz me on
                &lt;topic&gt;&rdquo;.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isBusy && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-[var(--card-bg)] border border-[var(--paper-line)] px-4 py-2.5 text-[var(--ink-soft)] text-sm">
                thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {error && (
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-800">
            <span>{error.message || "Something went wrong. Please try again."}</span>
            <div className="flex shrink-0 gap-3">
              <button
                onClick={() => regenerate()}
                className="font-medium underline underline-offset-2 hover:no-underline"
              >
                Retry
              </button>
              <button
                onClick={() => clearError()}
                className="text-red-500 hover:text-red-700"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-[var(--paper-line)] px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-2xl flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Explain recursion to me like I'm new to it…"
            className="flex-1 rounded-full bg-[var(--card-bg)] border border-[var(--paper-line)] px-5 py-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] outline-none focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="rounded-full bg-[var(--accent)] px-6 py-3 font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}