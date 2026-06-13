"use client";
import type { VolunteerItem, ColorTokens, Typography } from "@resumate/shared";

interface Props {
  data: VolunteerItem[];
  variant: string;
  colors: ColorTokens;
  typography: Typography;
  title?: string;
}

export function VolunteerRenderer({ data, colors, typography, title }: Props) {
  if (!data?.length) return null;
  const sectionTitle = title || "志愿者";

  return (
    <div className="py-2">
      <h2
        className={`${typography.scale.h2} border-b pb-1 mb-2`}
        style={{ color: colors.primary, borderColor: colors.divider }}
      >
        {sectionTitle}
      </h2>
      {data.map((item, i) => (
        <div key={item.id || i} className="mb-2">
          <div className="flex justify-between">
            <span className={typography.scale.h3} style={{ color: colors.textPrimary }}>
              {item.organization}
              {item.position && (
                <span style={{ color: colors.textSecondary }}> – {item.position}</span>
              )}
            </span>
            <span className={typography.scale.small} style={{ color: colors.textMuted }}>
              {item.startDate || ""} – {item.endDate || "至今"}
            </span>
          </div>
          {item.summary && (
            <p className={`${typography.scale.small} mt-0.5`} style={{ color: colors.textSecondary }}>
              {item.summary}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
