"use client";
import { memo } from "react";
import type { ResumeData, TemplateConfig, ColorTokens, Typography, SectionConfig } from "@resumate/shared";
import { HeaderRenderer } from "./header-renderer";
import { WorkExperienceRenderer } from "./work-exp-renderer";
import { EducationRenderer } from "./education-renderer";
import { SkillsRenderer } from "./skills-renderer";
import { ProjectsRenderer } from "./projects-renderer";
import { AwardsRenderer } from "./awards-renderer";
import { CertificatesRenderer } from "./certificates-renderer";
import { VolunteerRenderer } from "./volunteer-renderer";
import { LanguagesRenderer } from "./languages-renderer";
import { InterestsRenderer } from "./interests-renderer";
import { ReferencesRenderer } from "./references-renderer";
import { LayoutContainer } from "./layout-container";

interface Props {
  data: ResumeData;
  template: TemplateConfig;
  colors: ColorTokens;
  typography: Typography;
}

type SectionKey = keyof TemplateConfig["sections"];

export const ResumeRenderer = memo(function ResumeRenderer({
  data,
  template,
  colors,
  typography,
}: Props) {
  const { sections, layout, headerLayout, sectionDivider, spacing } = template;

  // 按 order 排序启用的 section
  const enabledSections = (Object.entries(sections) as [SectionKey, SectionConfig | undefined][])
    .filter(([, cfg]) => cfg?.enabled)
    .map(([key, cfg]) => [key, cfg!] as [SectionKey, SectionConfig])
    .sort(([, a], [, b]) => (a?.order ?? 999) - (b?.order ?? 999));

  const renderSection = (key: SectionKey, config: SectionConfig) => {
    const variant = config.variant;
    const title = config.title;

    switch (key) {
      case "header":
        return (
          <HeaderRenderer
            data={data.basics ?? {}}
            variant={variant === "compact" ? "compact" : "default"}
            colors={colors}
            typography={typography}
            headerLayout={headerLayout}
          />
        );
      case "work":
        return (
          <WorkExperienceRenderer
            data={data.work ?? []}
            variant={variant}
            colors={colors}
            typography={typography}
            title={title}
          />
        );
      case "education":
        return (
          <EducationRenderer
            data={data.education ?? []}
            variant={variant}
            colors={colors}
            typography={typography}
            title={title}
          />
        );
      case "skills":
        return (
          <SkillsRenderer
            data={data.skills ?? []}
            variant={variant}
            colors={colors}
            typography={typography}
            title={title}
          />
        );
      case "projects":
        return (
          <ProjectsRenderer
            data={data.projects ?? []}
            variant={variant}
            colors={colors}
            typography={typography}
            title={title}
          />
        );
      case "awards":
        return (
          <AwardsRenderer
            data={data.awards ?? []}
            variant={variant}
            colors={colors}
            typography={typography}
            title={title}
          />
        );
      case "certificates":
        return (
          <CertificatesRenderer
            data={data.certificates ?? []}
            variant={variant}
            colors={colors}
            typography={typography}
            title={title}
          />
        );
      case "publications":
        return data.publications?.length ? (
          <div className="py-2">
            <h2 className="border-b pb-1 mb-2" style={{ color: colors.primary, borderColor: colors.divider }}>
              {title || "出版物"}
            </h2>
            {data.publications.map((item, i) => (
              <div key={item.id || i} className="mb-2">
                <span style={{ color: colors.textPrimary }}><strong>{item.name}</strong></span>
                {item.publisher && <span style={{ color: colors.textSecondary }}> – {item.publisher}</span>}
                {item.summary && <p style={{ color: colors.textMuted }}>{item.summary}</p>}
              </div>
            ))}
          </div>
        ) : null;
      case "volunteer":
        return (
          <VolunteerRenderer
            data={data.volunteer ?? []}
            variant={variant}
            colors={colors}
            typography={typography}
            title={title}
          />
        );
      case "languages":
        return (
          <LanguagesRenderer
            data={data.languages ?? []}
            variant={variant}
            colors={colors}
            typography={typography}
            title={title}
          />
        );
      case "interests":
        return (
          <InterestsRenderer
            data={data.interests ?? []}
            variant={variant}
            colors={colors}
            typography={typography}
            title={title}
          />
        );
      case "references":
        return (
          <ReferencesRenderer
            data={data.references ?? []}
            variant={variant}
            colors={colors}
            typography={typography}
            title={title}
          />
        );
      default:
        return null;
    }
  };

  // 对于 sidebar 布局，区分 sidebar 内容和 main 内容
  // sidebar: header + skills + languages + interests (紧凑信息)
  // main: work + education + projects + 其他
  const sidebarKeys: SectionKey[] = ["skills", "languages", "interests"];
  const isSidebar = layout === "sidebar-left" || layout === "sidebar-right";

  if (isSidebar) {
    const sidebarContent = enabledSections
      .filter(([key]) => sidebarKeys.includes(key))
      .map(([key, cfg]) => (
        <div key={key}>{renderSection(key, cfg)}</div>
      ));

    const mainContent = enabledSections
      .filter(([key]) => !sidebarKeys.includes(key))
      .map(([key, cfg]) => (
        <div key={key}>{renderSection(key, cfg)}</div>
      ));

    return (
      <LayoutContainer
        layout={layout}
        colors={colors}
        spacing={spacing}
        sectionDivider={sectionDivider}
        sidebar={sidebarContent}
        main={mainContent}
      />
    );
  }

  return (
    <LayoutContainer
      layout={layout}
      colors={colors}
      spacing={spacing}
      sectionDivider={sectionDivider}
      main={enabledSections.map(([key, cfg]) => (
        <div key={key}>{renderSection(key, cfg)}</div>
      ))}
    />
  );
});
