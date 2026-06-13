"use client";
import type { LanguageItem, ColorTokens, Typography } from "@resumate/shared";

interface Props {
  data: LanguageItem[];
  variant: string;
  colors: ColorTokens;
  typography: Typography;
  title?: string;
}

export function LanguagesRenderer({ data, colors, typography, title }: Props) {
  if (!data?.length) return null;
  const sectionTitle = title || "语言";

  return (
    <div className="py-2">
      <h2
        className={`${typography.scale.h2} border-b pb-1 mb-2`}
        style={{ color: colors.primary, borderColor: colors.divider }}
      >
        {sectionTitle}
      </h2>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {data.map((item, i) => (
          <div key={item.id || i} className={typography.scale.body}>
            <span style={{ color: colors.textPrimary }}>
              <strong>{item.language}</strong>
            </span>
            <span className={typography.scale.small} style={{ color: colors.textSecondary }}>
              {" "}({item.fluency})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
