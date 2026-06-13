"use client";
import type { CertificateItem, ColorTokens, Typography } from "@resumate/shared";

interface Props {
  data: CertificateItem[];
  variant: string;
  colors: ColorTokens;
  typography: Typography;
  title?: string;
}

export function CertificatesRenderer({ data, colors, typography, title }: Props) {
  if (!data?.length) return null;
  const sectionTitle = title || "证书";

  return (
    <div className="py-2">
      <h2
        className={`${typography.scale.h2} border-b pb-1 mb-2`}
        style={{ color: colors.primary, borderColor: colors.divider }}
      >
        {sectionTitle}
      </h2>
      {data.map((item, i) => (
        <div key={item.id || i} className="mb-1.5 flex justify-between">
          <span className={typography.scale.body} style={{ color: colors.textPrimary }}>
            <strong>{item.name}</strong>
            {item.issuer && (
              <span style={{ color: colors.textSecondary }}> – {item.issuer}</span>
            )}
          </span>
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
