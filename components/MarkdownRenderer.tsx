"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-custom">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        children={content}
        components={{
          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 text-xl font-bold first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed text-foreground/80">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 ml-4 list-disc space-y-1 text-foreground/80">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 ml-4 list-decimal space-y-1 text-foreground/80">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-foreground/10">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-medium text-foreground/60">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-foreground/5 px-3 py-2 text-foreground/80">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline decoration-blue-400/30 transition-colors hover:text-blue-300"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-lg bg-foreground/5 p-3 text-sm">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-sm">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-foreground/20 pl-4 text-foreground/60">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-foreground/10" />,
        }}
      />
    </div>
  );
}
