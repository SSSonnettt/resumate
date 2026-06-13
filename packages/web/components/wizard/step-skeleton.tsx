"use client";
import { Spinner } from "@phosphor-icons/react";

export function StepSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={24} weight="light" className="animate-spin text-primary" />
        <p className="text-sm text-foreground-dim">加载中...</p>
      </div>
    </div>
  );
}
