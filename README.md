# Study Buddy Chat

An AI study assistant that streams answers token-by-token, and can quiz you
or summarize notes using tool calls — built to learn the Vercel AI SDK
(v5-style API) on top of Next.js App Router.

## Stack

- Next.js (App Router, Route Handlers)
- AI SDK (`ai` + `@ai-sdk/react` + `@ai-sdk/groq`)
- Groq as the LLM provider (fast + generous free tier)
- Tailwind CSS v4

## Setup

1. Install dependencies (already done if you got this as a scaffold):

   ```bash
   npm install
   ```

2. Get a free Groq API key: https://console.groq.com/keys

3. Copy the env example and add your key:

   ```bash
   cp .env.local.example .env.local
   # then edit .env.local and paste your key
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

## How it works

- `src/app/api/chat/route.ts` — a Route Handler that receives chat messages,
  calls `streamText` with a Groq model, and streams the response back as a
  UI message stream. It defines two tools the model can call:
  - `generateQuizQuestion` — triggered when you ask to be quizzed
  - `summarizeSection` — triggered when you ask for a summary of pasted notes
- `src/app/page.tsx` — the client UI, using the `useChat` hook from
  `@ai-sdk/react`. Messages arrive as `parts` (text parts, tool-call parts),
  which is the key mental model shift from a plain request/response API:
  the UI renders incrementally as parts stream in, including intermediate
  tool states (`input-streaming` → `input-available` → `output-available`).

## Things worth trying next

- Add a `pdfUpload` tool + Supabase/local parsing (you've done PDF/OCR in
  StudyAI already — could reuse that pipeline here).
- Swap localStorage persistence for a real database (so history follows you across devices)
- Add streaming reasoning display for a reasoning-capable Groq model.
- Swap the model per-request (fast model for quick Q&A, bigger model for
  harder quiz generation).

## Note on the Groq model

`llama-3.3-70b-versatile` was deprecated by Groq (June 2026), so this
project uses `openai/gpt-oss-120b` instead. If that also gets deprecated by
the time you read this, check https://console.groq.com/docs/models for the
current lineup — it's a one-line change in `route.ts`.
