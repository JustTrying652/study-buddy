import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_SECONDS = 10 * 60; // 10 minutes
const MAX_REQUESTS = 20; // per window, per user

// Calls a Postgres function that atomically checks-and-increments a
// per-user counter, so concurrent requests can't race past the limit
// the way a read-then-write from the server could.
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; resetAt: number }> {
  const { data, error } = await supabase
    .rpc("check_rate_limit", {
      p_user_id: userId,
      p_limit: MAX_REQUESTS,
      p_window_seconds: WINDOW_SECONDS,
    })
    .single();

  if (error || !data) {
    // If the rate-limit check itself fails, fail open — a broken limiter
    // shouldn't take down the whole app. Logged so it's visible.
    console.error("Rate limit check failed:", error);
    return { allowed: true, resetAt: Date.now() };
  }

  const row = data as { allowed: boolean; reset_at: string };
  return { allowed: row.allowed === true, resetAt: new Date(row.reset_at).getTime() };
}