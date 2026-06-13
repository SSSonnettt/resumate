"use client";
import type { SkillItem, ColorTokens, Typography, SectionVariant } from "@resumate/shared";

interface Props {
  data: SkillItem[];
  variant: SectionVariant;
  colors: ColorTokens;
  typography: Typography;
  title?: string;
}

export function SkillsRenderer({ data, variant, colors, typography, title }: Props) {
  if (!data?.length) return null;
  const sectionTitle = title || "技能";

  return (
    <div className="py-2">
      <h2
        className={`${typography.scale.h2} border-b pb-1 mb-2`}
        style={{ color: colors.primary, borderColor: colors.divider }}
      >
        {sectionTitle}
      </h2>

      {/* --- tag-cloud variant --- */}
      {variant === "tag-cloud" && (
        <div className="flex flex-wrap gap-1.5">
          {data.flatMap((cat) =>
            cat.keywords.map((kw, j) => (
              <span
                key={`${cat.id || cat.name}-${j}`}
                className={typography.scale.small}
                style={{
                  background: colors.surface,
                  color: colors.primary,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 4,
                  padding: "2px 8px",
                }}
              >
                {kw}
              </span>
            )),
          )}
        </div>
      )}

      {/* --- progress-bar variant --- */}
      {variant === "progress-bar" && (
        <div className="space-y-2">
          {data.map((cat) => (
            <div key={cat.id || cat.name}>
              <div className="flex justify-between mb-0.5">
                <span className={typography.scale.body} style={{ color: colors.textPrimary }}>
                  {cat.name}
                </span>
                {cat.level && (
                  <span className={typography.scale.small} style={{ color: colors.textMuted }}>
                    {cat.level}
                  </span>
                )}
              </div>
              <div className="h-1.5 rounded-full" style={{ background: colors.surface }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    background: colors.primary,
                    width: cat.level
                      ? cat.level === "Master" ? "100%" : cat.level === "Advanced" ? "75%" : cat.level === "Intermediate" ? "50%" : "25%"
                      : `${Math.min((cat.keywords?.length || 0) * 20, 100)}%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {cat.keywords?.map((kw, j) => (
                  <span key={j} className={typography.scale.caption} style={{ color: colors.textMuted }}>
                    {kw}{j < cat.keywords.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- compact variant --- */}
      {variant === "compact" && (
        <div>
          {data.map((cat) => (
            <div key={cat.id || cat.name} className="mb-0.5">
              <span className={typography.scale.body} style={{ color: colors.textPrimary }}>
                <strong>{cat.name}</strong>:{" "}
              </span>
              <span className={typography.scale.small} style={{ color: colors.textSecondary }}>
                {cat.keywords.join(" · ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* --- default variant --- */}
      {variant === "default" && (
        <div>
          {data.map((cat) => (
            <div key={cat.id || cat.name} className="mb-2">
              <span className={typography.scale.h3} style={{ color: colors.textPrimary }}>
                {cat.name}:{" "}
              </span>
              {cat.keywords.map((kw, j) => (
                <span
                  key={j}
                  className={typography.scale.small}
                  style={{
                    background: colors.surface,
                    color: colors.textSecondary,
                    borderRadius: 4,
                    padding: "1px 6px",
                    marginRight: 4,
                    marginBottom: 2,
                    display: "inline-block",
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
