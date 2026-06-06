import type { ChatMessage } from "@resumate/shared";
import Link from "next/link";

/** 简单 Markdown 链接解析：[text](url) */
function renderContent(content: string) {
  const parts: Array<{ type: "text" | "link"; text: string; href?: string }> =
    [];
  const linkRegex = /\[([^\]]+)\]\((\/[^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", text: match[1]!, href: match[2]! });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", text: content });
  }

  return parts;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const parts = renderContent(message.content);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">
          {parts.map((part, i) =>
            part.type === "link" && part.href ? (
              <Link
                key={i}
                href={part.href}
                className={`underline ${
                  isUser ? "text-blue-200" : "text-blue-600"
                }`}
              >
                {part.text}
              </Link>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
      </div>
    </div>
  );
}
