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
import {
  extractDocxText,
  extractPdfText,
  isDocx,
  isImage,
  isPdf,
} from "@/lib/file-extraction";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Study Buddy, a warm, encouraging AI tutor helping a university
Computer Science student understand a topic. Keep explanations clear and concise,
use short paragraphs or bullet points, and build on what the student already
said. Prefer plain language before jargon, and use a concrete example where it helps.

The student may attach notes or past papers (PDFs, Word documents, or photos of
handwritten pages). Attached PDFs and Word documents appear as plain text prefixed
with "[Attached ...]" — treat that as reference material the student wants help
with. Attached images are shown to you directly — read any visible text and
diagrams yourself.

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

type UIMessagePart = UIMessage["parts"][number];

// Attached PDFs/Word docs can't be read natively by the model, so we swap
// them for extracted plain text before the request goes out. Images are
// left as-is and shown to the model directly (it can read them itself).
async function prepareMessagesForModel(
  messages: UIMessage[]
): Promise<{ modelMessages: UIMessage[]; hasImage: boolean }> {
  let hasImage = false;
  const modelMessages: UIMessage[] = [];

  for (const message of messages) {
    const newParts: UIMessagePart[] = [];

    for (const part of message.parts) {
      if (part.type !== "file") {
        newParts.push(part);
        continue;
      }

      const filename = part.filename ?? "file";

      if (isPdf(part.mediaType)) {
        try {
          const text = await extractPdfText(part.url);
          newParts.push({ type: "text", text: `[Attached PDF: ${filename}]\n${text}` });
        } catch (e) {
          console.error("PDF extraction failed:", e);
          newParts.push({
            type: "text",
            text: `[Could not read attached PDF "${filename}" — it may be corrupted, scanned as images, or password-protected.]`,
          });
        }
      } else if (isDocx(part.mediaType)) {
        try {
          const text = await extractDocxText(part.url);
          newParts.push({ type: "text", text: `[Attached document: ${filename}]\n${text}` });
        } catch (e) {
          console.error("DOCX extraction failed:", e);
          newParts.push({
            type: "text",
            text: `[Could not read attached document "${filename}".]`,
          });
        }
      } else if (isImage(part.mediaType)) {
        hasImage = true;
        newParts.push(part);
      } else {
        newParts.push({
          type: "text",
          text: `[Attached file "${filename}" has an unsupported type and was skipped.]`,
        });
      }
    }

    modelMessages.push({ ...message, parts: newParts });
  }

  return { modelMessages, hasImage };
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
    const { modelMessages, hasImage } = await prepareMessagesForModel(messages);

    // Photos of notes need a vision-capable model; plain text/PDF/DOCX
    // conversations stay on the faster text-only model.
    const model = hasImage ? groq("qwen/qwen3.6-27b") : groq("openai/gpt-oss-120b");

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(modelMessages),
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