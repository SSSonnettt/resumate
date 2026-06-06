import type { Module, Theme } from "@resumate/shared";
import { HeaderRenderer } from "./header-renderer";
import { WorkExperienceRenderer } from "./work-exp-renderer";
import { EducationRenderer } from "./education-renderer";
import { SkillsRenderer } from "./skills-renderer";
import { SummaryRenderer } from "./summary-renderer";
import { ProjectsRenderer } from "./projects-renderer";
import { CustomRenderer } from "./custom-renderer";

interface Props {
  module: Module;
  theme: Theme;
}

export function ModuleRenderer({ module, theme }: Props) {
  if (!module.visible) return null;

  switch (module.type) {
    case "header":
      return <HeaderRenderer data={module.data} theme={theme} />;
    case "work-experience":
      return (
        <WorkExperienceRenderer data={module.data} theme={theme} />
      );
    case "education":
      return <EducationRenderer data={module.data} theme={theme} />;
    case "skills":
      return <SkillsRenderer data={module.data} theme={theme} />;
    case "summary":
      return <SummaryRenderer data={module.data} />;
    case "projects":
      return <ProjectsRenderer data={module.data} theme={theme} />;
    case "custom":
      return <CustomRenderer data={module.data} />;
    default:
      return null;
  }
}
