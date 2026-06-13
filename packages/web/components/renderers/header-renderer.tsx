"use client";
import type { Basics, ColorTokens, Typography, HeaderLayout } from "@resumate/shared";

interface Props {
  data: Basics;
  variant: "default" | "compact";
  colors: ColorTokens;
  typography: Typography;
  headerLayout: HeaderLayout;
}

export function HeaderRenderer({ data, variant, colors, typography, headerLayout }: Props) {
  const name = data.name || "姓名";
  const label = data.label || "";
  const contacts: Array<{ icon: string; text: string; link?: string }> = [];

  if (data.email) contacts.push({ icon: "✉", text: data.email, link: `mailto:${data.email}` });
  if (data.phone) contacts.push({ icon: "☎", text: data.phone });
  if (data.url) contacts.push({ icon: "🌐", text: data.url, link: data.url });
  if (data.profiles) {
    for (const p of data.profiles) {
      contacts.push({ icon: p.network, text: p.username, link: p.url });
    }
  }

  if (variant === "compact") {
    return (
      <div className="py-2" style={{ color: colors.textPrimary }}>
        <h1 className={typography.scale.h1} style={{ color: colors.primary }}>
          {name}
        </h1>
        {label && (
          <p className={typography.scale.small} style={{ color: colors.textSecondary }}>
            {label}
          </p>
        )}
      </div>
    );
  }

  const isCentered = headerLayout === "centered";
  const isLeftAligned = headerLayout === "left-aligned";

  return (
    <div
      className={`py-4 ${isCentered ? "text-center" : ""} ${isLeftAligned ? "text-left" : ""} ${!isCentered && !isLeftAligned ? "flex justify-between items-end" : ""}`}
      style={{ color: colors.textPrimary }}
    >
      <div>
        <h1 className={typography.scale.h1} style={{ color: colors.primary }}>
          {name}
        </h1>
        {label && (
          <p className={`${typography.scale.body} mt-1`} style={{ color: colors.textSecondary }}>
            {label}
          </p>
        )}
      </div>
      {contacts.length > 0 && (
        <div className={`${typography.scale.small} space-y-1 ${isCentered ? "mt-2" : ""}`}>
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center gap-1 justify-end">
              <span style={{ color: colors.textMuted }}>{c.icon}</span>
              {c.link ? (
                <a href={c.link} target="_blank" rel="noopener" className="underline" style={{ color: colors.accent }}>
                  {c.text}
                </a>
              ) : (
                <span>{c.text}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
