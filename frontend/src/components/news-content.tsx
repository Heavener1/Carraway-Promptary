import type { ReactNode } from "react";

/**
 * Renders the lightweight Markdown subset editors use for news: headings,
 * dash lists and paragraphs. Everything is emitted as text nodes, never HTML.
 */
export function NewsContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let key = 0;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={key++} className="whitespace-pre-wrap">
        {paragraph.join("\n")}
      </p>,
    );
    paragraph = [];
  }

  function flushList() {
    if (list.length === 0) return;
    blocks.push(
      <ul key={key++} className="space-y-2 pl-5">
        {list.map((item, index) => (
          <li key={index} className="list-disc pl-1 marker:text-accent/70">
            {item}
          </li>
        ))}
      </ul>,
    );
    list = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trimStart();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={key++} className="pt-2 text-lg font-semibold text-foreground">
          {trimmed.slice(4)}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h2 key={key++} className="pt-4 text-xl font-semibold text-foreground">
          {trimmed.slice(3)}
        </h2>,
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push(
        <h2
          key={key++}
          className="pt-4 text-2xl font-semibold text-foreground"
        >
          {trimmed.slice(2)}
        </h2>,
      );
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return (
    <div className="space-y-6 text-[15px] leading-8 text-foreground/85">
      {blocks}
    </div>
  );
}
