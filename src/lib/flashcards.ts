import { createClient } from "@/lib/supabase/client";

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  intervalDays: number;
  nextReviewAt: number;
};

type FlashcardRow = {
  id: string;
  front: string;
  back: string;
  interval_days: number;
  next_review_at: string;
};

function rowToFlashcard(row: FlashcardRow): Flashcard {
  return {
    id: row.id,
    front: row.front,
    back: row.back,
    intervalDays: row.interval_days,
    nextReviewAt: new Date(row.next_review_at).getTime(),
  };
}

// Cards due now (or overdue) — newly created cards default to "due
// immediately" so they show up the first time you open review mode.
export async function fetchDueFlashcards(): Promise<Flashcard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("flashcards")
    .select("id, front, back, interval_days, next_review_at")
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true });

  if (error) {
    console.error("Could not load flashcards", error);
    return [];
  }
  return (data ?? []).map(rowToFlashcard);
}

export async function countAllFlashcards(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("flashcards")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("Could not count flashcards", error);
    return 0;
  }
  return count ?? 0;
}

const MAX_INTERVAL_DAYS = 60;

// Simple interval-doubling spaced repetition: knowing a card pushes it
// further out each time (capped), forgetting resets it to daily review.
export async function markReviewed(card: Flashcard, knewIt: boolean): Promise<void> {
  const nextInterval = knewIt ? Math.min(card.intervalDays * 2, MAX_INTERVAL_DAYS) : 1;
  const nextReviewAt = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000);

  const supabase = createClient();
  const { error } = await supabase
    .from("flashcards")
    .update({ interval_days: nextInterval, next_review_at: nextReviewAt.toISOString() })
    .eq("id", card.id);

  if (error) {
    console.error("Could not update flashcard schedule", error);
  }
}