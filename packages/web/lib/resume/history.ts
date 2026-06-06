import {
  applyPatches,
  enablePatches,
  produceWithPatches,
  type Draft,
  type Patch,
} from "immer";
import type { Resume } from "@resumate/shared";

enablePatches();

export interface ResumeHistoryEntry {
  redo: Patch[];
  undo: Patch[];
}

export interface ResumeHistoryState {
  resume: Resume;
  undoStack: ResumeHistoryEntry[];
  redoStack: ResumeHistoryEntry[];
}

export function commitResumeMutation(
  state: ResumeHistoryState,
  recipe: (draft: Draft<Resume>) => void,
): ResumeHistoryState {
  const [resume, redo, undo] = produceWithPatches(state.resume, recipe);

  if (redo.length === 0 && undo.length === 0) {
    return state;
  }

  return {
    resume,
    undoStack: [...state.undoStack, { redo, undo }],
    redoStack: [],
  };
}

export function undoResumeMutation(
  state: ResumeHistoryState,
): ResumeHistoryState {
  const entry = state.undoStack.at(-1);
  if (!entry) return state;

  return {
    resume: applyPatches(state.resume, entry.undo),
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, entry],
  };
}

export function redoResumeMutation(
  state: ResumeHistoryState,
): ResumeHistoryState {
  const entry = state.redoStack.at(-1);
  if (!entry) return state;

  return {
    resume: applyPatches(state.resume, entry.redo),
    undoStack: [...state.undoStack, entry],
    redoStack: state.redoStack.slice(0, -1),
  };
}
