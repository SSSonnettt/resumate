import type { ColorTokens, TemplateConfig, ResumeData } from "@resumate/shared";

/** 将 ColorTokens 转为 CSS custom properties 对象 */
export function buildCSSVars(colors: ColorTokens): Record<string, string> {
  return {
    "--color-primary": colors.primary,
    "--color-primary-light": colors.primaryLight,
    "--color-primary-dark": colors.primaryDark,
    "--color-accent": colors.accent,
    "--color-background": colors.background,
    "--color-surface": colors.surface,
    "--color-text-primary": colors.textPrimary,
    "--color-text-secondary": colors.textSecondary,
    "--color-text-muted": colors.textMuted,
    "--color-border": colors.border,
    "--color-divider": colors.divider,
  };
}

/** 检测当前简历数据在目标模板下缺失哪些启用的章节 */
export function getMissingSections(
  data: ResumeData,
  template: TemplateConfig,
): string[] {
  const missing: string[] = [];

  const sectionKeys: Array<{ key: keyof ResumeData; label: string }> = [
    { key: "basics", label: "基本信息" },
    { key: "work", label: "工作经历" },
    { key: "education", label: "教育背景" },
    { key: "skills", label: "技能" },
    { key: "projects", label: "项目经验" },
    { key: "awards", label: "获奖" },
    { key: "certificates", label: "证书" },
    { key: "publications", label: "出版物" },
    { key: "volunteer", label: "志愿者" },
    { key: "languages", label: "语言" },
    { key: "interests", label: "兴趣" },
    { key: "references", label: "推荐信" },
  ];

  for (const { key, label } of sectionKeys) {
    const config = (template.sections as Record<string, { enabled?: boolean }>)[key];
    if (config?.enabled === false) continue;

    const value = data[key];
    if (value == null) {
      missing.push(label);
    } else if (Array.isArray(value) && value.length === 0) {
      missing.push(label);
    }
  }

  return missing;
}
