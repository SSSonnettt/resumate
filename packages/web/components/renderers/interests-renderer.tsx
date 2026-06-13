"use client";
import type { InterestItem, ColorTokens, Typography } from "@resumate/shared";

interface Props {
  data: InterestItem[];
  variant: string;
  colors: ColorTokens;
  typography: Typography;
  title?: string;
}

export function InterestsRenderer({ data, colors, typography, title }: Props) {
  if (!data?.length) return null;
  const sectionTitle = title || "兴趣";

  return (
    <div className="py-2">
      <h2
        className={`${typography.scale.h2} border-b pb-1 mb-2`}
        style={{ color: colors.primary, borderColor: colors.divider }}
      >
        {sectionTitle}
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {data.map((item, i) => (
          <span
            key={item.id || i}
            className={typography.scale.small}
            style={{
              background: colors.surface,
              color: colors.textSecondary,
              borderRadius: 4,
              padding: "2px 8px",
            }}
          >
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}
