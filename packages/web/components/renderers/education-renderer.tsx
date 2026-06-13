"use client";
import type { EducationItem, ColorTokens, Typography, SectionVariant } from "@resumate/shared";

interface Props {
  data: EducationItem[];
  variant: SectionVariant;
  colors: ColorTokens;
  typography: Typography;
  title?: string;
}

export function EducationRenderer({ data, variant, colors, typography, title }: Props) {
  if (!data?.length) return null;
  const sectionTitle = title || "教育背景";

  return (
    <div className="py-2">
      <h2
        className={`${typography.scale.h2} border-b pb-1 mb-2`}
        style={{ color: colors.primary, borderColor: colors.divider }}
      >
        {sectionTitle}
      </h2>
      {data.map((item, i) => {
        const dateStr =
          item.startDate || item.endDate
            ? `${item.startDate || ""} – ${item.endDate || "至今"}`
            : "";

        if (variant === "compact") {
          return (
            <div key={item.id || i} className="flex justify-between mb-0.5">
              <span className={typography.scale.body} style={{ color: colors.textPrimary }}>
                <strong>{item.institution}</strong>
                {item.area && ` · ${item.area}`}
                {item.studyType && ` · ${item.studyType}`}
              </span>
              <span className={typography.scale.caption} style={{ color: colors.textMuted }}>
                {dateStr}
              </span>
            </div>
          );
        }

        return (
          <div key={item.id || i} className="mb-2 flex justify-between">
            <div>
              <span className={typography.scale.h3} style={{ color: colors.textPrimary }}>
                {item.institution}
              </span>
              {(item.area || item.studyType) && (
                <span className={typography.scale.small} style={{ color: colors.textSecondary }}>
                  {" "}· {[item.area, item.studyType].filter(Boolean).join(" · ")}
                </span>
              )}
              {item.score && (
                <span className={typography.scale.small} style={{ color: colors.textMuted }}>
                  {" "}GPA: {item.score}
                </span>
              )}
            </div>
            <span className={typography.scale.small} style={{ color: colors.textMuted }}>
              {dateStr}
            </span>
          </div>
        );
      })}
    </div>
  );
}
