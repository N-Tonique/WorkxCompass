"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownViewProps = {
  markdown: string;
  titleToFilename?: Record<string, string>;
};

export function MarkdownView({ markdown, titleToFilename = {} }: MarkdownViewProps) {
  const withWikilinks = markdown.replace(
    /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g,
    (_full, target: string, label?: string) => {
      const title = target.trim();
      const text = (label ?? title).trim();
      const file = titleToFilename[title];
      if (file) {
        return `[${text}](/notes/${encodeURIComponent(file)})`;
      }
      return `**${text}**`;
    },
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => {
          const internal = href?.startsWith("/notes/");
          if (internal && href) {
            return (
              <Link href={href} className="text-[var(--accent-bright)] underline-offset-2 hover:underline">
                {children}
              </Link>
            );
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-bright)] underline-offset-2 hover:underline"
            >
              {children}
            </a>
          );
        },
        h1: ({ children }) => (
          <h1 className="mb-4 font-[family-name:var(--font-display)] text-2xl text-white">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-3 mt-8 font-[family-name:var(--font-display)] text-xl text-white">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-6 text-lg font-semibold text-white">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-4 text-[15px] leading-relaxed text-white/80">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 list-disc space-y-1 pl-5 text-white/80">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 list-decimal space-y-1 pl-5 text-white/80">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-[13px] text-[var(--accent-bright)]">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="mb-4 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-[13px] text-teal-50/90">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-4 border-l-2 border-[var(--accent)]/50 pl-4 text-white/65">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-8 border-white/10" />,
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
      }}
    >
      {withWikilinks}
    </ReactMarkdown>
  );
}
