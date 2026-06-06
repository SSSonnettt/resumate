import { describe, expect, it } from "vitest";
import {
  createDefaultModule,
  createEmptyResume,
  moduleTypes,
  normalizeResumeOrder,
  resumeModuleSchema,
  resumeSchema,
} from "./resume";

describe("resume model", () => {
  it("creates valid default modules for every module type", () => {
    moduleTypes.forEach((type, index) => {
      expect(resumeModuleSchema.parse(createDefaultModule(type, index))).toMatchObject({
        type,
        order: index,
        visible: true,
      });
    });
  });

  it("rejects mismatched module data", () => {
    expect(() =>
      resumeModuleSchema.parse({
        id: "bad-module",
        type: "header",
        order: 0,
        visible: true,
        data: { items: [] },
      }),
    ).toThrow();
  });

  it("normalizes module order", () => {
    const resume = createEmptyResume("resume-1");
    resume.modules = [
      createDefaultModule("skills", 2, "skills"),
      createDefaultModule("header", 0, "header"),
      createDefaultModule("summary", 1, "summary"),
    ];

    const normalized = normalizeResumeOrder(resume);

    expect(resumeSchema.parse(normalized).modules.map((module) => module.id)).toEqual([
      "header",
      "summary",
      "skills",
    ]);
    expect(normalized.modules.map((module) => module.order)).toEqual([0, 1, 2]);
  });
});
