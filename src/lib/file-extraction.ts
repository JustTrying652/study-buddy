import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

// Keep injected file text from blowing out the model's context window.
const MAX_EXTRACTED_CHARS = 15000;

function truncate(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_EXTRACTED_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_EXTRACTED_CHARS)}\n\n[…truncated, file was longer]`;
}

// UI file parts carry the file as a data URL (e.g. "data:application/pdf;base64,...").
function dataUrlToBuffer(url: string): Buffer {
  const base64 = url.slice(url.indexOf(",") + 1);
  return Buffer.from(base64, "base64");
}

export async function extractPdfText(dataUrl: string): Promise<string> {
  const buffer = dataUrlToBuffer(dataUrl);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return truncate(text);
}

export async function extractDocxText(dataUrl: string): Promise<string> {
  const buffer = dataUrlToBuffer(dataUrl);
  const result = await mammoth.extractRawText({ buffer });
  return truncate(result.value);
}

export function isPdf(mediaType: string) {
  return mediaType === "application/pdf";
}

export function isDocx(mediaType: string) {
  return (
    mediaType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export function isImage(mediaType: string) {
  return mediaType.startsWith("image/");
}