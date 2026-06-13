"use client";

import { memo, useState } from "react";
import type { ChatMessage, FileAttachment } from "@resumate/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CaretDown, CaretRight, FileText } from "@phosphor-icons/react";
import { ThinkingBlock } from "./thinking-block";

interface MessageBubbleProps {
  message: ChatMessage;
  reasoningContent?: string;
  attachments?: FileAttachment[];
}

export const MessageBubble = memo(function MessageBubble({
  message,
  reasoningContent,
  attachments,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [expandedAttachments, setExpandedAttachments] = useState<
    Record<number, boolean>
  >({});

  const toggleAttachment = (index: number) => {
    setExpandedAttachments((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "border border-primary/20 bg-primary/[0.08] text-foreground shadow-[0_0_20px_var(--primary-glow)]"
            : "border border-white/[0.06] bg-white/[0.02] text-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] backdrop-blur-sm"
        }`}
      >
        {/* 思考过程（仅 assistant + 有推理内容时展示） */}
        {!isUser && reasoningContent && (
          <ThinkingBlock content={reasoningContent} />
        )}

        {/* 消息正文 */}
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-p:leading-relaxed prose-li:text-foreground/80 prose-strong:text-foreground prose-a:text-primary prose-code:text-primary prose-code:bg-white/[0.04] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-white/[0.03] prose-pre:text-foreground/80">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* 文件附件展开查看 */}
        {isUser && attachments && attachments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {attachments.map((attachment, index) => (
              <div key={index}>
                <button
                  onClick={() => toggleAttachment(index)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-xs text-foreground-muted transition-colors hover:bg-white/[0.06] hover:text-foreground-dim"
                >
                  {expandedAttachments[index] ? (
                    <CaretDown size={12} weight="bold" />
                  ) : (
                    <CaretRight size={12} weight="bold" />
                  )}
                  <FileText size={12} weight="light" />
                  <span>
                    查看解析内容（{attachment.charCount.toLocaleString()} 字符）
                  </span>
                </button>
                {expandedAttachments[index] && (
                  <div className="mt-1.5 max-h-64 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/20 p-3">
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground-muted font-mono">
                      {attachment.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
