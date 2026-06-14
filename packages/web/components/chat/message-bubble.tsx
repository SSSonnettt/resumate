"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ChatMessage, FileAttachment } from "@resumate/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CaretDown, CaretRight, FileText, User, Sparkle } from "@phosphor-icons/react";
import { ThinkingBlock } from "./thinking-block";
import { pageItemVariants } from "@/lib/motion";

interface MessageBubbleProps {
  message: ChatMessage;
  reasoningContent?: string;
  attachments?: FileAttachment[];
  /** 入场动画延迟（毫秒），用于多条消息的级联动画 */
  revealDelay?: number;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  reasoningContent,
  attachments,
  revealDelay = 0,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [expandedAttachments, setExpandedAttachments] = useState<
    Record<number, boolean>
  >({});
  const [visible, setVisible] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);

  // 渐进入场动画：IntersectionObserver + 自定义 cubic-bezier
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    // 如果消息 id 为 "streaming"（流式消息），立即显示无需动画
    if (message.id === "streaming") {
      setVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      setVisible(true);
    }, revealDelay);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [message.id, revealDelay]);

  const toggleAttachment = (index: number) => {
    setExpandedAttachments((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <motion.div
      ref={elRef}
      variants={pageItemVariants}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-5`}
    >
      {/* AI 头像 · 紫罗兰微光 */}
      {!isUser && (
        <span className="mr-2.5 mt-0.5 flex size-7 shrink-0 items-center justify-center bg-foreground/5 ring-1 ring-foreground/10">
          <Sparkle size={13} weight="light" className="text-secondary/60" />
        </span>
      )}

      <div className={`flex max-w-[75%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        {/* 气泡 · 玻璃质感 + 尾巴 */}
        <div
          className={`px-4 py-3 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isUser
              ? "bg-foreground text-background border-2 border-foreground"
              : "border-l-4 border-accent bg-foreground/5 border border-foreground/10"
          }`}
        >
          {/* 思考过程 */}
          {!isUser && reasoningContent && (
            <ThinkingBlock content={reasoningContent} />
          )}

          {/* 消息正文 */}
          {isUser ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-foreground/90 prose-p:text-foreground/70 prose-p:leading-relaxed prose-li:text-foreground/70 prose-strong:text-foreground/85 prose-a:text-primary/70 prose-code:bg-foreground/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[11px] prose-code:text-primary/70 prose-pre:border prose-pre:border-foreground/10 prose-pre:bg-foreground/[0.04] prose-pre:text-foreground/60">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* 文件附件 · 玻璃折叠 */}
        {isUser && attachments && attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((attachment, index) => (
              <div key={index}>
                <button
                  onClick={() => toggleAttachment(index)}
                  className="inline-flex items-center gap-1.5 border border-foreground/10 bg-card px-2.5 py-1.5 text-[11px] text-foreground-dim/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-foreground/25 hover:bg-foreground/5"
                >
                  {expandedAttachments[index] ? (
                    <CaretDown size={10} weight="bold" />
                  ) : (
                    <CaretRight size={10} weight="bold" />
                  )}
                  <FileText size={10} weight="light" />
                  <span>
                    {attachment.charCount.toLocaleString()} 字符
                  </span>
                </button>
                {expandedAttachments[index] && (
                  <div className="mt-1 max-h-64 overflow-y-auto border border-foreground/10 bg-foreground/[0.04] p-3">
                    <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground-muted/50">
                      {attachment.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 时间戳 */}
        <span className="mt-1 px-1 text-[10px] text-foreground-muted/20">
          {new Date(message.timestamp).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* 用户头像 · 微光 */}
      {isUser && (
        <span className="ml-2.5 mt-0.5 flex size-7 shrink-0 items-center justify-center bg-card ring-1 ring-foreground/10">
          <User size={13} weight="light" className="text-foreground-dim/40" />
        </span>
      )}
    </motion.div>
  );
});