import { describe, expect, it } from "vitest";
import {
  createEmptyResume,
  detectResumeVersion,
  jsonResumeSchema,
  loadResume,
  migrateV2ToV3,
  migrateV3ToV4,
  resumeSchema,
  resumeSchemaV3,
} from "./resume";

describe("JSON Resume schema", () => {
  it("parses a valid minimal resume data", () => {
    const result = jsonResumeSchema.safeParse({
      basics: {
        name: "张三",
        label: "前端工程师",
        email: "zhangsan@example.com",
      },
      work: [
        {
          name: "某公司",
          position: "高级前端",
          startDate: "2021-07",
          endDate: "2023-02",
        },
      ],
      skills: [
        {
          name: "前端",
          keywords: ["JavaScript", "TypeScript", "React"],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("parses empty resume data", () => {
    const result = jsonResumeSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("Resume", () => {
  it("createEmptyResume returns valid resume", () => {
    const resume = createEmptyResume();
    expect(resumeSchema.safeParse(resume).success).toBe(true);
    expect(resume.themeSlug).toBe("flat");
    expect(resume.data).toEqual({});
  });

  it("resumeSchema parses with default themeSlug", () => {
    const result = resumeSchema.safeParse({
      id: "test",
      data: { basics: { name: "张三" } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.themeSlug).toBe("flat");
    }
  });
});

describe("Resume (v3 migration)", () => {
  it("resumeSchemaV3 parses old v3 format", () => {
    const oldV3 = resumeSchemaV3.parse({
      id: "test",
      data: {},
      theme: {
        templateId: "minimal-professional",
        colors: { primary: "#1e293b", primaryLight: "#475569", primaryDark: "#0f172a", accent: "#2563eb", background: "#ffffff", surface: "#f8fafc", textPrimary: "#0f172a", textSecondary: "#475569", textMuted: "#94a3b8", border: "#e2e8f0", divider: "#cbd5e1" },
        typography: { fontFamily: "sans", scale: { h1: "text-3xl font-bold", h2: "text-lg font-semibold", h3: "text-sm font-semibold", body: "text-sm", small: "text-xs", caption: "text-[10px]" } },
        spacing: "normal",
      },
    });
    expect(oldV3.theme.templateId).toBe("minimal-professional");
    expect(oldV3.theme.colors.primary).toBe("#1e293b");
  });
});

describe("detectResumeVersion", () => {
  it("detects v4 format (themeSlug)", () => {
    expect(detectResumeVersion({ id: "test", data: { basics: { name: "张三" } }, themeSlug: "flat" })).toBe(4);
  });

  it("detects v3 format (data.basics)", () => {
    expect(detectResumeVersion({ data: { basics: { name: "张三" } }, theme: {} })).toBe(3);
  });

  it("detects v2 format (modules + skills categories)", () => {
    expect(
      detectResumeVersion({
        modules: [
          { type: "skills", data: { categories: [{ name: "前端", tags: ["JS"] }] } },
        ],
        theme: {},
      }),
    ).toBe(2);
  });

  it("detects v1 format (modules + skills items)", () => {
    expect(
      detectResumeVersion({
        modules: [
          { type: "skills", data: { items: ["JS", "React"] } },
        ],
        theme: {},
      }),
    ).toBe(1);
  });

  it("returns 0 for unrecognized format", () => {
    expect(detectResumeVersion(null)).toBe(0);
    expect(detectResumeVersion("string")).toBe(0);
    expect(detectResumeVersion({})).toBe(0);
  });
});

describe("migrateV2ToV3", () => {
  it("migrates header module to basics", () => {
    const v2 = {
      id: "resume-1",
      modules: [
        {
          id: "h1",
          type: "header" as const,
          order: 0,
          visible: true,
          data: {
            name: "张三",
            jobTitle: "前端",
            contacts: [
              { icon: "email", text: "z@test.com" },
              { icon: "phone", text: "123" },
              { icon: "GitHub", text: "zhangsan", link: "https://github.com/zhangsan" },
            ],
          },
        },
      ],
      theme: {
        templateId: "blue-simple",
        primaryColor: "#2563eb",
        fontFamily: "sans" as const,
        fontSize: "medium" as const,
        spacing: "normal" as const,
      },
    };
    const v3 = migrateV2ToV3(v2);
    expect(v3.data.basics?.name).toBe("张三");
    expect(v3.data.basics?.label).toBe("前端");
    expect(v3.data.basics?.email).toBe("z@test.com");
    expect(v3.data.basics?.phone).toBe("123");
    expect(v3.data.basics?.profiles).toHaveLength(1);
    expect(v3.data.basics?.profiles?.[0].network).toBe("GitHub");
  });

  it("migrates work-experience to work array", () => {
    const v2 = {
      id: "resume-1",
      modules: [
        {
          id: "w1",
          type: "work-experience" as const,
          order: 0,
          visible: true,
          data: {
            items: [
              {
                company: "某公司",
                position: "工程师",
                startDate: "2020-01",
                endDate: "2022-12",
                description: "开发了系统",
              },
            ],
          },
        },
      ],
      theme: {
        templateId: "blue-simple",
        primaryColor: "#000",
        fontFamily: "sans" as const,
        fontSize: "medium" as const,
        spacing: "normal" as const,
      },
    };
    const v3 = migrateV2ToV3(v2);
    expect(v3.data.work).toHaveLength(1);
    expect(v3.data.work?.[0].name).toBe("某公司");
    expect(v3.data.work?.[0].position).toBe("工程师");
    expect(v3.data.work?.[0].summary).toBe("开发了系统");
  });

  it("migrates skills to skills array", () => {
    const v2 = {
      id: "resume-1",
      modules: [
        {
          id: "s1",
          type: "skills" as const,
          order: 0,
          visible: true,
          data: {
            categories: [
              { name: "前端", tags: ["JS", "React"] },
              { name: "后端", tags: ["Node"] },
            ],
          },
        },
      ],
      theme: {
        templateId: "blue-simple",
        primaryColor: "#000",
        fontFamily: "sans" as const,
        fontSize: "medium" as const,
        spacing: "normal" as const,
      },
    };
    const v3 = migrateV2ToV3(v2);
    expect(v3.data.skills).toHaveLength(2);
    expect(v3.data.skills?.[0].name).toBe("前端");
    expect(v3.data.skills?.[0].keywords).toEqual(["JS", "React"]);
  });
});

describe("migrateV3ToV4", () => {
  it("migrates v3 to v4 with themeSlug", () => {
    const v3 = resumeSchemaV3.parse({
      id: "test-id",
      data: { basics: { name: "张三" } },
      theme: {
        templateId: "minimal-professional",
        colors: { primary: "#1e293b", primaryLight: "#475569", primaryDark: "#0f172a", accent: "#2563eb", background: "#ffffff", surface: "#f8fafc", textPrimary: "#0f172a", textSecondary: "#475569", textMuted: "#94a3b8", border: "#e2e8f0", divider: "#cbd5e1" },
        typography: { fontFamily: "sans", scale: { h1: "text-3xl", h2: "text-lg", h3: "text-sm", body: "text-sm", small: "text-xs", caption: "text-[10px]" } },
        spacing: "normal",
      },
    });
    const v4 = migrateV3ToV4(v3);
    expect(v4.id).toBe("test-id");
    expect(v4.themeSlug).toBe("flat");
    expect(v4.data.basics?.name).toBe("张三");
  });

  it("maps known template IDs to community slugs", () => {
    const v3 = resumeSchemaV3.parse({
      id: "test-id",
      data: {},
      theme: {
        templateId: "modern-sidebar",
        colors: { primary: "#1e293b", primaryLight: "#475569", primaryDark: "#0f172a", accent: "#2563eb", background: "#ffffff", surface: "#f8fafc", textPrimary: "#0f172a", textSecondary: "#475569", textMuted: "#94a3b8", border: "#e2e8f0", divider: "#cbd5e1" },
        typography: { fontFamily: "sans", scale: { h1: "text-3xl", h2: "text-lg", h3: "text-sm", body: "text-sm", small: "text-xs", caption: "text-[10px]" } },
        spacing: "normal",
      },
    });
    const v4 = migrateV3ToV4(v3);
    expect(v4.themeSlug).toBe("sidebar");
  });

  it("falls back to flat for unknown template IDs", () => {
    const v3 = resumeSchemaV3.parse({
      id: "test-id",
      data: {},
      theme: {
        templateId: "unknown-template",
        colors: { primary: "#1e293b", primaryLight: "#475569", primaryDark: "#0f172a", accent: "#2563eb", background: "#ffffff", surface: "#f8fafc", textPrimary: "#0f172a", textSecondary: "#475569", textMuted: "#94a3b8", border: "#e2e8f0", divider: "#cbd5e1" },
        typography: { fontFamily: "sans", scale: { h1: "text-3xl", h2: "text-lg", h3: "text-sm", body: "text-sm", small: "text-xs", caption: "text-[10px]" } },
        spacing: "normal",
      },
    });
    const v4 = migrateV3ToV4(v3);
    expect(v4.themeSlug).toBe("flat");
  });
});

describe("loadResume", () => {
  it("loads v4 resume directly", () => {
    const v4 = createEmptyResume("test-id");
    v4.data = { basics: { name: "张三" } };
    const loaded = loadResume(v4);
    expect(loaded.id).toBe("test-id");
    expect(loaded.themeSlug).toBe("flat");
  });

  it("auto-migrates v3 to v4", () => {
    const v3 = resumeSchemaV3.parse({
      id: "test-id",
      data: {},
      theme: {
        templateId: "minimal-professional",
        colors: { primary: "#1e293b", primaryLight: "#475569", primaryDark: "#0f172a", accent: "#2563eb", background: "#ffffff", surface: "#f8fafc", textPrimary: "#0f172a", textSecondary: "#475569", textMuted: "#94a3b8", border: "#e2e8f0", divider: "#cbd5e1" },
        typography: { fontFamily: "sans", scale: { h1: "text-3xl", h2: "text-lg", h3: "text-sm", body: "text-sm", small: "text-xs", caption: "text-[10px]" } },
        spacing: "normal",
      },
    });
    const loaded = loadResume(v3);
    expect(loaded.id).toBe("test-id");
    expect(loaded.themeSlug).toBe("flat");
  });

  it("auto-migrates v2 to v4", () => {
    const v2 = {
      id: "resume-1",
      modules: [
        {
          id: "h1",
          type: "header" as const,
          order: 0,
          visible: true,
          data: { name: "张三", jobTitle: "前端", contacts: [] },
        },
      ],
      theme: {
        templateId: "blue-simple",
        primaryColor: "#2563eb",
        fontFamily: "sans" as const,
        fontSize: "medium" as const,
        spacing: "normal" as const,
      },
    };
    const loaded = loadResume(v2);
    expect(loaded.data.basics?.name).toBe("张三");
    expect(loaded.themeSlug).toBe("flat");
  });
});
