import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.04] bg-white/[0.015] px-8 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <span className="flex size-12 items-center justify-center rounded-xl bg-white/[0.02] ring-1 ring-white/[0.04]">
          {icon}
        </span>
      )}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground-dim">{title}</p>
        {description && (
          <p className="max-w-xs text-xs leading-relaxed text-foreground-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
