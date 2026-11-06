import type { ReactNode } from "react";
import type { WebResult } from "@/lib/web-search";
export default function CitedWebAnswer({ result }: { result: WebResult }) {
  const parts: ReactNode[] = [];
  let position = 0;
  for (const [i, c] of result.citations.entries()) {
    if (c.start < position) continue;
    parts.push(result.answer.slice(position, c.start));
    parts.push(
      <a
        key={i}
        href={c.url}
        title={c.title}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        [{result.sources.findIndex((s) => s.url === c.url) + 1}]
      </a>,
    );
    position = c.end;
  }
  parts.push(result.answer.slice(position));
  return <div className="cited-answer">{parts}</div>;
}
