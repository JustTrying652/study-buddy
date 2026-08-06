import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";

const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="font-display text-base font-semibold mt-2.5 mb-1 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display text-[15px] font-semibold mt-2.5 mb-1 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[15px] font-semibold mt-2 mb-1 first:mt-0">{children}</h3>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--accent)] underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[var(--paper-line)] pl-3 italic text-[var(--ink-soft)] mb-2">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-[var(--paper-line)]" />,
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className || "");
    if (match) {
      const codeText = String(children).replace(/\n$/, "");
      return (
        <div className="mb-2 last:mb-0 overflow-hidden rounded-lg bg-[var(--ink)]">
          <div className="flex items-center justify-between px-3 pt-2">
            <span className="font-mono-note text-[10px] uppercase tracking-wider text-[var(--card-bg)]/50">
              {match[1]}
            </span>
          </div>
          <SyntaxHighlighter
            language={match[1]}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: "0.5rem 0.75rem 0.75rem",
              background: "transparent",
              fontSize: "13px",
            }}
            codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
          >
            {codeText}
          </SyntaxHighlighter>
        </div>
      );
    }
    return (
      <code className="font-mono-note text-[13px] bg-black/[0.06] rounded px-1 py-0.5">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-[var(--paper-line)] px-2 py-1 text-left font-semibold bg-black/[0.03]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[var(--paper-line)] px-2 py-1">{children}</td>
  ),
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="text-[15px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}