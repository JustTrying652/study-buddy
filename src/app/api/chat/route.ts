import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  UIMessage,
} from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Study Buddy, a warm, encouraging AI tutor helping a university
Computer Science student understand a topic. Keep explanations clear and concise,
use short paragraphs or bullet points, and build on what the student already
said. Prefer plain language before jargon, and use a concrete example where it helps.

When you explain a term or concept the student should remember, call the
"flashcard" tool to pin it to the margin as a study card. Do this once or twice
per answer at most, only for genuinely important terms, not everything.

After explaining something substantial, you may call the "quiz" tool once to
check understanding with a single multiple-choice question. Don't quiz on
every turn — only when it naturally helps.`;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not set");
    return jsonError(
      "The server is missing its Groq API key. Add GROQ_API_KEY to .env.local and restart the dev server.",
      500
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local";

  const { allowed, resetAt } = checkRateLimit(ip);
  if (!allowed) {
    const secondsLeft = Math.ceil((resetAt - Date.now()) / 1000);
    return jsonError(
      `You've hit the message limit for now. Try again in about ${Math.ceil(secondsLeft / 60)} minute(s).`,
      429
    );
  }

  let messages: UIMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
  } catch {
    return jsonError("Couldn't read the request body.", 400);
  }

  try {
    const result = streamText({
      model: groq("openai/gpt-oss-120b"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: {
        flashcard: {
          description:
            "Pin a flashcard-style index card to the study margin for a key term or concept the student should remember.",
          inputSchema: z.object({
            front: z.string().describe("The term or question side of the card"),
            back: z.string().describe("The definition or answer side of the card"),
          }),
          execute: async ({ front, back }: { front: string; back: string }) => {
            return { front, back, savedAt: Date.now() };
          },
        },
        quiz: {
          description:
            "Ask the student a single multiple-choice question to check understanding of what was just explained.",
          inputSchema: z.object({
            question: z.string(),
            options: z.array(z.string()).length(4),
            correctIndex: z.number().int().min(0).max(3),
          }),
          execute: async (input: {
            question: string;
            options: string[];
            correctIndex: number;
          }) => {
            return input;
          },
        },
      },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        onError: (error) => {
          // Log the real error server-side, but never leak internals to the client.
          console.error("Stream error:", error);
          return "Something went wrong while generating a response. Please try again.";
        },
      }),
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return jsonError("Something went wrong talking to the AI. Please try again.", 502);
  }
}