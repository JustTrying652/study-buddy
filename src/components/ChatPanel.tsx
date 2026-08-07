"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import type { UIMessage } from "ai";
import { Markdown } from "@/components/Markdown";

type FlashcardOutput = { front: string; back: string };
type QuizOutput = { question: string; options: string[]; correctIndex: number };

// The SDK's sendMessage() wants a real FileList for file attachments;
// this builds one from files gathered across possibly multiple attach clicks.
function fileListFrom(files: File[]): FileList {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  return dt.files;
}

function fileTypeLabel(file: File): string {
  if (file.type === "application/pdf") return "PDF";
  if (file.type.includes("wordprocessingml")) return "DOCX";
  if (file.type.startsWith("image/")) return "Image";
  return "File";
}

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
                className={`rounded-2xl ${
                  isUser
                    ? "bg-[var(--accent)] text-white rounded-br-sm px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap"
                    : "bg-[var(--card-bg)] text-[var(--ink)] rounded-bl-sm border border-[var(--paper-line)] px-4 py-3"
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

          if (part.type === "file") {
            if (part.mediaType.startsWith("image/")) {
              return (
                // eslint-disable-next-line @next/next/no-img-element -- data-URL thumbnail, not worth Next/Image here
                <img
                  key={i}
                  src={part.url}
                  alt={part.filename ?? "Attached image"}
                  className="max-h-48 rounded-xl border border-[var(--paper-line)] object-cover"
                />
              );
            }
            return (
              <span
                key={i}
                className="flex items-center gap-1.5 rounded-full border border-[var(--paper-line)] bg-[var(--card-bg)] px-3 py-1 text-xs text-[var(--ink-soft)]"
              >
                <span className="font-mono-note font-medium text-[var(--accent)]">
                  {part.mediaType.includes("wordprocessingml") ? "DOCX" : "PDF"}
                </span>
                {part.filename ?? "attachment"}
              </span>
            );
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
  onToggleSidebar,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
  onMessagesChange: (messages: UIMessage[]) => void;
  onToggleSidebar: () => void;
}) {
  // Capture the initial messages once — after that, useChat owns the
  // conversation and we never want a changing prop to re-seed it.
  const [initial] = useState(initialMessages);

  const { messages, sendMessage, status, error, clearError, regenerate } = useChat({
    id: sessionId,
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { sessionId } }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep the latest messages/callback in refs so the effect below can
  // read them without needing them as dependencies — avoids an update loop.
  const messagesRef = useRef(messages);
  const onMessagesChangeRef = useRef(onMessagesChange);
  useEffect(() => {
    messagesRef.current = messages;
    onMessagesChangeRef.current = onMessagesChange;
  });

  // Only persist at the end of a turn (or on error), not on every streamed token.
  useEffect(() => {
    if (status === "ready" || status === "error") {
      onMessagesChangeRef.current(messagesRef.current);
    }
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isBusy = status === "submitted" || status === "streaming";

  const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB per file

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow picking the same file again later

    const tooBig = picked.filter((f) => f.size > MAX_FILE_BYTES);
    const ok = picked.filter((f) => f.size <= MAX_FILE_BYTES);

    if (tooBig.length > 0) {
      setFileError(`${tooBig.map((f) => f.name).join(", ")} — over the 8MB limit, skipped.`);
    } else {
      setFileError(null);
    }

    if (ok.length > 0) {
      setPendingFiles((prev) => [...prev, ...ok]);
    }
  }

  function handleRemoveFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && pendingFiles.length === 0) || isBusy) return;

    const files = pendingFiles.length > 0 ? fileListFrom(pendingFiles) : undefined;
    sendMessage({
      text: trimmed || "Take a look at what I've attached.",
      files,
    });
    setInput("");
    setPendingFiles([]);
    setFileError(null);
  }

  return (
    <div className="flex h-screen flex-1 flex-col min-w-0">
      <header className="flex items-center gap-2 border-b border-[var(--paper-line)] px-3 py-3 sm:px-6 sm:py-4">
        <button
          onClick={onToggleSidebar}
          className="shrink-0 rounded-md p-1.5 text-[var(--ink-soft)] transition-colors hover:bg-black/[0.05] hover:text-[var(--ink)]"
          aria-label="Toggle sessions"
        >
          ☰
        </button>
        <div className="flex min-w-0 flex-col justify-center">
          <h1 className="font-hand text-3xl leading-none text-[var(--accent)]">Study Buddy</h1>
          <p className="mt-1 hidden truncate text-sm text-[var(--ink-soft)] sm:block">
            Explains concepts, quizzes you, and remembers where you left off.
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
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-[var(--paper-line)] bg-[var(--card-bg)] px-4 py-3">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
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
        <div className="mx-auto max-w-2xl">
          {fileError && (
            <p className="mb-2 text-xs text-red-700">{fileError}</p>
          )}

          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingFiles.map((file, i) => (
                <span
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--paper-line)] bg-[var(--card-bg)] pl-3 pr-1.5 py-1 text-xs text-[var(--ink-soft)]"
                >
                  <span className="font-mono-note font-medium text-[var(--accent)]">
                    {fileTypeLabel(file)}
                  </span>
                  <span className="max-w-[10rem] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(i)}
                    className="rounded-full px-1 text-[var(--ink-soft)] hover:bg-black/[0.06] hover:text-[var(--ink)]"
                    aria-label={`Remove ${file.name}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 sm:gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              onChange={handleFilesSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 rounded-full border border-[var(--paper-line)] bg-[var(--card-bg)] px-3.5 text-lg text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              aria-label="Attach notes or past papers"
              title="Attach a PDF, Word doc, or photo of your notes"
            >
              📎
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Explain recursion to me like I'm new to it…"
              className="flex-1 rounded-full bg-[var(--card-bg)] border border-[var(--paper-line)] px-5 py-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] outline-none focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
            />
            <button
              type="submit"
              disabled={isBusy || (!input.trim() && pendingFiles.length === 0)}
              className="rounded-full bg-[var(--accent)] px-6 py-3 font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}