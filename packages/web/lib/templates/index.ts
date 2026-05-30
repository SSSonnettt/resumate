import type { Template } from "@ai-resume/shared";
import blueSimple from "./blue-simple.json";
import classicBlack from "./classic-black.json";
import elegantSerif from "./elegant-serif.json";

export const templates: Template[] = [
  blueSimple,
  classicBlack,
  elegantSerif,
] as Template[];

export function getTemplate(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}
