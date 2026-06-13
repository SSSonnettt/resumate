"use client";
import type { ReferenceItem, ColorTokens, Typography } from "@resumate/shared";

interface Props {
  data: ReferenceItem[];
  variant: string;
  colors: ColorTokens;
  typography: Typography;
  title?: string;
}

export function ReferencesRenderer({ data, colors, typography, title }: Props) {
  if (!data?.length) return null;
  const sectionTitle = title || "推荐信";

  return (
    <div className="py-2">
      <h2
        className={`${typography.scale.h2} border-b pb-1 mb-2`}
        style={{ color: colors.primary, borderColor: colors.divider }}
      >
        {sectionTitle}
      </h2>
      {data.map((item, i) => (
        <div
          key={item.id || i}
          className="mb-2 p-3 rounded-lg border-l-4"
          style={{
            background: colors.surface,
            borderColor: colors.primary,
          }}
        >
          <p className={`${typography.scale.body} italic`} style={{ color: colors.textSecondary }}>
            "{item.reference}"
          </p>
          <p className={`${typography.scale.h3} mt-1`} style={{ color: colors.primary }}>
            – {item.name}
          </p>
        </div>
      ))}
    </div>
  );
}
