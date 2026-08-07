"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchDueFlashcards, markReviewed, type Flashcard } from "@/lib/flashcards";

export default function ReviewPage() {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    fetchDueFlashcards().then((cards) => {
      setQueue(cards);
      setLoading(false);
    });
  }, []);

  const total = queue.length;
  const current = queue[index];

  async function handleAnswer(knewIt: boolean) {
    if (!current) return;
    await markReviewed(current, knewIt);
    setReviewedCount((c) => c + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="notebook-page flex min-h-screen flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--accent)]"
          >
            ← Back to chat
          </Link>
          {total > 0 && index < total && (
            <span className="font-mono-note text-xs text-[var(--ink-soft)]">
              {index + 1} of {total}
            </span>
          )}
        </div>

        <h1 className="font-hand text-4xl text-[var(--accent)] mb-6 text-center">Review</h1>

        {loading ? (
          <p className="text-center text-sm text-[var(--ink-soft)]">Loading your deck…</p>
        ) : total === 0 ? (
          <div className="rounded-xl border border-[var(--paper-line)] bg-[var(--card-bg)] px-5 py-8 text-center">
            <p className="text-sm text-[var(--ink)]">Nothing due for review right now.</p>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              Chat with Study Buddy about a topic — it pins flashcards here automatically as you
              go.
            </p>
          </div>
        ) : index >= total ? (
          <div className="rounded-xl border border-[var(--paper-line)] bg-[var(--card-bg)] px-5 py-8 text-center">
            <p className="text-sm text-[var(--ink)]">
              Done — reviewed {reviewedCount} card{reviewedCount === 1 ? "" : "s"}.
            </p>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              Cards you knew come back later; ones you didn&apos;t come back tomorrow.
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={() => setRevealed((r) => !r)}
              className="w-full -rotate-1 rounded-sm border border-black/5 bg-[var(--highlight)] px-6 py-10 text-center shadow-md transition-transform hover:rotate-0"
            >
              <p className="font-mono-note text-[10px] uppercase tracking-wider text-[var(--ink-soft)] mb-3">
                {revealed ? "answer" : "term · tap to flip"}
              </p>
              <p className="font-hand text-3xl leading-snug text-[var(--ink)]">
                {revealed ? current.back : current.front}
              </p>
            </button>

            {revealed && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleAnswer(false)}
                  className="flex-1 rounded-full border border-[var(--paper-line)] px-4 py-2.5 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:border-red-400 hover:text-red-600"
                >
                  Still learning
                </button>
                <button
                  onClick={() => handleAnswer(true)}
                  className="flex-1 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
                >
                  Got it
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}