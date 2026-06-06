import { describe, expect, it } from "vitest";
import { createDefaultModule, createEmptyResume } from "@resumate/shared";
import {
  commitResumeMutation,
  redoResumeMutation,
  undoResumeMutation,
  type ResumeHistoryState,
} from "./history";

describe("resume history", () => {
  it("commits, undoes, and redoes mutations", () => {
    const initial: ResumeHistoryState = {
      resume: createEmptyResume("resume-1"),
      undoStack: [],
      redoStack: [],
    };

    const committed = commitResumeMutation(initial, (draft) => {
      draft.modules.push(createDefaultModule("header", 0, "header"));
    });
    expect(committed.resume.modules).toHaveLength(1);
    expect(committed.undoStack).toHaveLength(1);

    const undone = undoResumeMutation(committed);
    expect(undone.resume.modules).toHaveLength(0);
    expect(undone.redoStack).toHaveLength(1);

    const redone = redoResumeMutation(undone);
    expect(redone.resume.modules).toHaveLength(1);
    expect(redone.resume.modules[0]?.id).toBe("header");
  });

  it("clears redo stack after a new commit", () => {
    const initial: ResumeHistoryState = {
      resume: createEmptyResume("resume-1"),
      undoStack: [],
      redoStack: [],
    };

    const committed = commitResumeMutation(initial, (draft) => {
      draft.modules.push(createDefaultModule("header", 0, "header"));
    });
    const undone = undoResumeMutation(committed);
    const next = commitResumeMutation(undone, (draft) => {
      draft.modules.push(createDefaultModule("summary", 0, "summary"));
    });

    expect(next.redoStack).toHaveLength(0);
    expect(next.resume.modules[0]?.type).toBe("summary");
  });
});
