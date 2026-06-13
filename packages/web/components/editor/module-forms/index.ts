import { HeaderForm } from "./header-form";
import { WorkExperienceForm } from "./work-experience-form";
import { EducationForm } from "./education-form";
import { SkillsForm } from "./skills-form";
import { ProjectsForm } from "./projects-form";

export function getFormForSection(
  sectionKey: string,
): React.ComponentType<{
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}> | null {
  switch (sectionKey) {
    case "basics":
      return HeaderForm as unknown as React.ComponentType<{
        data: Record<string, unknown>;
        onChange: (data: Record<string, unknown>) => void;
      }>;
    case "work":
      return WorkExperienceForm as unknown as React.ComponentType<{
        data: Record<string, unknown>;
        onChange: (data: Record<string, unknown>) => void;
      }>;
    case "education":
      return EducationForm as unknown as React.ComponentType<{
        data: Record<string, unknown>;
        onChange: (data: Record<string, unknown>) => void;
      }>;
    case "skills":
      return SkillsForm as unknown as React.ComponentType<{
        data: Record<string, unknown>;
        onChange: (data: Record<string, unknown>) => void;
      }>;
    case "projects":
      return ProjectsForm as unknown as React.ComponentType<{
        data: Record<string, unknown>;
        onChange: (data: Record<string, unknown>) => void;
      }>;
    default:
      return null;
  }
}

export { HeaderForm, WorkExperienceForm, EducationForm, SkillsForm, ProjectsForm };
