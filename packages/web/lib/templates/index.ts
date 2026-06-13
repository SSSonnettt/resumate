import type { TemplateConfig } from "@resumate/shared";
import minimalProfessional from "./minimal-professional.json";
import modernSidebar from "./modern-sidebar.json";
import elegantTimeline from "./elegant-timeline.json";
import creativeSplit from "./creative-split.json";
import compactDense from "./compact-dense.json";

export const templates: TemplateConfig[] = [
  minimalProfessional,
  modernSidebar,
  elegantTimeline,
  creativeSplit,
  compactDense,
] as TemplateConfig[];

export function getTemplate(id: string): TemplateConfig | undefined {
  return templates.find((t) => t.id === id);
}
