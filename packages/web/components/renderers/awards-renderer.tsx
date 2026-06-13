"use client";
import type { AwardItem, ColorTokens, Typography } from "@resumate/shared";

interface Props {
  data: AwardItem[];
  variant: string;
  colors: ColorTokens;
  typography: Typography;
  title?: string;
}

export function AwardsRenderer({ data, colors, typography, title }: Props) {
  if (!data?.length) return null;
  const sectionTitle = title || "获奖";

  return (
    <div className="py-2">
      <h2
        className={`${typography.scale.h2} border-b pb-1 mb-2`}
        style={{ color: colors.primary, borderColor: colors.divider }}
      >
        {sectionTitle}
      </h2>
      {data.map((item, i) => (
        <div key={item.id || i} className="mb-2 flex justify-between">
          <div>
            <span className={typography.scale.h3} style={{ color: colors.textPrimary }}>
              {item.title}
            </span>
            {item.awarder && (
              <span className={typography.scale.small} style={{ color: colors.textSecondary }}>
                {" "}– {item.awarder}
              </span>
            )}
            {item.summary && (
              <p className={typography.scale.small} style={{ color: colors.textMuted }}>
                {item.summary}
              </p>
            )}
          </div>
          {item.date && (
            <span className={typography.scale.small} style={{ color: colors.textMuted }}>
              {item.date}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
