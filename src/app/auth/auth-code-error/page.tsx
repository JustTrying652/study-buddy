import Link from "next/link";

export default function AuthCodeError() {
  return (
    <div className="notebook-page flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-hand text-3xl text-[var(--accent)] mb-2">That link didn&apos;t work</p>
      <p className="text-sm text-[var(--ink-soft)] mb-6 max-w-sm">
        It may have expired or already been used. Magic links are single-use and only last a
        little while — request a fresh one.
      </p>
      <Link
        href="/login"
        className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white"
      >
        Back to sign in
      </Link>
    </div>
  );
}