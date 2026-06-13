"use client";
import type { ProjectItem, ColorTokens, Typography, SectionVariant } from "@resumate/shared";

interface Props {
  data: ProjectItem[];
  variant: SectionVariant;
  colors: ColorTokens;
  typography: Typography;
  title?: string;
}

export function ProjectsRenderer({ data, variant, colors, typography, title }: Props) {
  if (!data?.length) return null;
  const sectionTitle = title || "项目经验";

  return (
    <div className="py-2">
      <h2
        className={`${typography.scale.h2} border-b pb-1 mb-2`}
        style={{ color: colors.primary, borderColor: colors.divider }}
      >
        {sectionTitle}
      </h2>

      {/* --- card variant --- */}
      {variant === "card" && (
        <div className="grid grid-cols-2 gap-3">
          {data.map((item, i) => (
            <div
              key={item.id || i}
              className="p-3 rounded-lg"
              style={{ background: colors.surface, borderColor: colors.border, borderWidth: 1 }}
            >
              <h3 className={typography.scale.h3} style={{ color: colors.primary }}>
                {item.name}
              </h3>
              {item.description && (
                <p className={`${typography.scale.small} mt-1`} style={{ color: colors.textSecondary }}>
                  {item.description}
                </p>
              )}
              {item.keywords && item.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.keywords.map((tech, j) => (
                    <span
                      key={j}
                      className={typography.scale.caption}
                      style={{
                        background: colors.background,
                        color: colors.primary,
                        borderRadius: 4,
                        padding: "1px 6px",
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* --- compact variant --- */}
      {variant === "compact" && (
        <div>
          {data.map((item, i) => (
            <div key={item.id || i} className="mb-1 flex justify-between">
              <span className={typography.scale.body} style={{ color: colors.textPrimary }}>
                <strong>{item.name}</strong>
                {item.description && (
                  <span style={{ color: colors.textSecondary }}> – {item.description}</span>
                )}
              </span>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener" className={typography.scale.caption} style={{ color: colors.accent }}>
                  链接
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* --- default variant --- */}
      {(variant === "default" || !variant) && (
        <div>
          {data.map((item, i) => (
            <div key={item.id || i} className="mb-2">
              <div className="flex justify-between">
                <span className={typography.scale.h3} style={{ color: colors.textPrimary }}>
                  {item.name}
                </span>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener" className={typography.scale.small} style={{ color: colors.accent }}>
                    链接
                  </a>
                )}
              </div>
              {item.description && (
                <p className={`${typography.scale.body} mt-1 whitespace-pre-wrap`} style={{ color: colors.textSecondary }}>
                  {item.description}
                </p>
              )}
              {item.keywords && item.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.keywords.map((tech, j) => (
                    <span
                      key={j}
                      className={typography.scale.small}
                      style={{
                        background: colors.surface,
                        color: colors.textSecondary,
                        borderRadius: 4,
                        padding: "1px 6px",
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
