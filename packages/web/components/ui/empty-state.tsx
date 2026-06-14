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
        "flex flex-col items-center justify-center gap-4 border-2 border-foreground/10 bg-card px-8 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <span className="flex size-12 items-center justify-center border-2 border-foreground/10 bg-foreground/5">
          {icon}
        </span>
      )}
      <div className="space-y-1.5">
        <p className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</p>
        {description && (
          <p className="max-w-xs font-mono text-xs leading-relaxed text-foreground-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
