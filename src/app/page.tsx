"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

type QuizOutput = {
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  instructions: string;
};

type SummaryOutput = {
  keyPoints: string[];
};

function ToolCard({
  toolName,
  state,
  output,
}: {
  toolName: string;
  state: string;
  output: unknown;
}) {
  if (toolName === "generateQuizQuestion") {
    const o = output as QuizOutput | undefined;
    return (
      <div className="msg-enter -rotate-1 rounded-sm bg-[var(--highlight)] p-4 text-[var(--ink)] shadow-md max-w-sm border border-black/5">
        <p className="font-hand text-2xl leading-none mb-1">Pop quiz!</p>
        <p className="font-mono-note text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">
          {o ? `${o.topic} · ${o.difficulty}` : state === "input-streaming" ? "writing a question…" : "preparing…"}
        </p>
      </div>
    );
  }

  if (toolName === "summarizeSection") {
    const o = output as SummaryOutput | undefined;
    return (
      <div className="msg-enter rotate-1 rounded-sm bg-[var(--mint)]/25 border border-[var(--mint)] p-4 max-w-sm">
        <p className="font-hand text-2xl leading-none mb-2 text-[#3d5c47]">
          Key points
        </p>
        {o ? (
          <ul className="text-sm space-y-1 list-disc list-inside text-[var(--ink)]">
            {o.keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--ink-soft)]">summarizing…</p>
        )}
      </div>
    );
  }

  return null;
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`msg-enter flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div
                key={i}
                className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-[var(--accent)] text-white rounded-br-sm"
                    : "bg-[var(--card-bg)] text-[var(--ink)] rounded-bl-sm border border-[var(--paper-line)]"
                }`}
              >
                {part.text}
              </div>
            );
          }

          if (part.type === "tool-generateQuizQuestion" || part.type === "tool-summarizeSection") {
            const toolName =
              part.type === "tool-generateQuizQuestion" ? "generateQuizQuestion" : "summarizeSection";
            const output = "output" in part && part.state === "output-available" ? part.output : undefined;
            return <ToolCard key={i} toolName={toolName} state={part.state} output={output} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
    <div className="flex h-screen flex-col">
      <header className="border-b border-[var(--paper-line)] px-6 py-4 flex items-baseline gap-3">
        <h1 className="font-hand text-4xl text-[var(--accent)]">Study Buddy</h1>
        <p className="text-sm text-[var(--ink-soft)] font-mono-note">
          explains · quizzes · streams in real time
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
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

      <form onSubmit={handleSubmit} className="border-t border-[var(--paper-line)] px-6 py-4">
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
