import { describe, expect, it } from "vitest";
import { createEmptyResume } from "@resumate/shared";
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
      draft.data.basics = { name: "张三" };
    });
    expect(committed.resume.data.basics?.name).toBe("张三");
    expect(committed.undoStack).toHaveLength(1);

    const undone = undoResumeMutation(committed);
    expect(undone.resume.data.basics).toBeUndefined();
    expect(undone.redoStack).toHaveLength(1);

    const redone = redoResumeMutation(undone);
    expect(redone.resume.data.basics?.name).toBe("张三");
  });

  it("clears redo stack after a new commit", () => {
    const initial: ResumeHistoryState = {
      resume: createEmptyResume("resume-1"),
      undoStack: [],
      redoStack: [],
    };

    const committed = commitResumeMutation(initial, (draft) => {
      draft.data.basics = { name: "张三" };
    });
    const undone = undoResumeMutation(committed);
    const next = commitResumeMutation(undone, (draft) => {
      draft.data.basics = { name: "李四", label: "设计师" };
    });

    expect(next.redoStack).toHaveLength(0);
    expect(next.resume.data.basics?.name).toBe("李四");
    expect(next.resume.data.basics?.label).toBe("设计师");
  });
});
