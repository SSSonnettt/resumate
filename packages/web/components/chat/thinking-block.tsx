"use client";

import { Brain, CaretDown } from "@phosphor-icons/react";
import { useState } from "react";

interface ThinkingBlockProps {
  content: string;
}

export function ThinkingBlock({ content }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!content) return null;

  return (
    <div className="mb-2 border border-primary/10 bg-primary/[0.03]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-primary/80 transition-colors hover:bg-primary/[0.06]"
      >
        <Brain size={14} weight="light" className="shrink-0" />
        <span>思考过程</span>
        <CaretDown
          size={14}
          weight="light"
          className={`ml-auto shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
        />
      </button>
      {isOpen && (
        <div className="border-t border-primary/10 px-3 py-2">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground-dim/60 italic">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}
