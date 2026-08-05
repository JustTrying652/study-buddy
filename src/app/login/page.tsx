"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("signups not allowed")) {
        setStatus("error");
        setErrorMessage(
          "That email hasn't been invited yet. Ask Evans to add you, then try again."
        );
        return;
      }
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="notebook-page flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-hand text-5xl text-[var(--accent)] mb-2">Study Buddy</h1>
        <p className="text-sm text-[var(--ink-soft)] mb-8">
          Sign in with your email — no password needed.
        </p>

        {status === "sent" ? (
          <div className="rounded-xl border border-[var(--paper-line)] bg-[var(--card-bg)] px-5 py-6">
            <p className="text-sm text-[var(--ink)]">
              Check <span className="font-medium">{email}</span> for a sign-in link.
            </p>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              It may take a minute to arrive — check spam too.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-full border border-[var(--paper-line)] bg-[var(--card-bg)] px-5 py-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] outline-none focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-full bg-[var(--accent)] px-6 py-3 font-medium text-white disabled:opacity-40"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-700">{errorMessage}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}