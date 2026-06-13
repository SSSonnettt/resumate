"use client";
import type { WorkItem, ColorTokens, Typography, SectionVariant } from "@resumate/shared";

interface Props {
  data: WorkItem[];
  variant: SectionVariant;
  colors: ColorTokens;
  typography: Typography;
  title?: string;
}

export function WorkExperienceRenderer({ data, variant, colors, typography, title }: Props) {
  if (!data?.length) return null;
  const sectionTitle = title || "工作经验";

  const renderItem = (item: WorkItem, i: number) => {
    const dateStr =
      item.startDate || item.endDate
        ? `${item.startDate || ""} – ${item.endDate || "至今"}`
        : "";

    // --- compact variant ---
    if (variant === "compact") {
      return (
        <div key={item.id || i} className="mb-1.5">
          <div className="flex justify-between">
            <span className={typography.scale.h3} style={{ color: colors.textPrimary }}>
              {item.position} · {item.name}
            </span>
            <span className={typography.scale.caption} style={{ color: colors.textMuted }}>
              {dateStr}
            </span>
          </div>
          {item.summary && (
            <p className={typography.scale.small} style={{ color: colors.textSecondary }}>
              {item.summary}
            </p>
          )}
        </div>
      );
    }

    // --- timeline variant ---
    if (variant === "timeline") {
      return (
        <div key={item.id || i} className="flex gap-4 mb-4">
          <div className="shrink-0 w-24 text-right">
            <span className={typography.scale.small} style={{ color: colors.textMuted }}>
              {dateStr}
            </span>
          </div>
          <div className="flex-1 border-l-2 pl-4" style={{ borderColor: colors.divider }}>
            <h3 className={typography.scale.h3} style={{ color: colors.textPrimary }}>
              {item.position}
            </h3>
            <p className={typography.scale.small} style={{ color: colors.primary }}>
              {item.name}
            </p>
            {item.summary && (
              <p className={`${typography.scale.body} mt-1 whitespace-pre-wrap`} style={{ color: colors.textSecondary }}>
                {item.summary}
              </p>
            )}
            {item.highlights && item.highlights.length > 0 && (
              <ul className="mt-1 list-disc list-inside">
                {item.highlights.map((h, j) => (
                  <li key={j} className={typography.scale.small} style={{ color: colors.textSecondary }}>
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );
    }

    // --- default variant ---
    return (
      <div key={item.id || i} className="mb-3">
        <div className="flex justify-between">
          <span className={typography.scale.h3} style={{ color: colors.textPrimary }}>
            {item.position}
            {item.name && (
              <span style={{ color: colors.textSecondary }}> · {item.name}</span>
            )}
          </span>
          <span className={typography.scale.small} style={{ color: colors.textMuted }}>
            {dateStr}
          </span>
        </div>
        {item.summary && (
          <p className={`${typography.scale.body} mt-1 whitespace-pre-wrap`} style={{ color: colors.textSecondary }}>
            {item.summary}
          </p>
        )}
        {item.highlights && item.highlights.length > 0 && (
          <ul className="mt-1 list-disc list-inside">
            {item.highlights.map((h, j) => (
              <li key={j} className={typography.scale.small} style={{ color: colors.textSecondary }}>
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="py-2">
      <h2
        className={`${typography.scale.h2} border-b pb-1 mb-2`}
        style={{ color: colors.primary, borderColor: colors.divider }}
      >
        {sectionTitle}
      </h2>
      {data.map((item, i) => renderItem(item, i))}
    </div>
  );
}
