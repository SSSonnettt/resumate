import {
  createEmptyResume,
  normalizeResumeOrder,
  resumeSchema,
  type Resume,
} from "@resumate/shared";

export const RESUME_STORAGE_KEY = "resumate-data";

export function loadResumeFromStorage(storage: Storage): Resume | null {
  try {
    const raw = storage.getItem(RESUME_STORAGE_KEY);
    if (!raw) return null;
    return normalizeResumeOrder(resumeSchema.parse(JSON.parse(raw)));
  } catch {
    return null;
  }
}

export function saveResumeToStorage(storage: Storage, resume: Resume): void {
  storage.setItem(
    RESUME_STORAGE_KEY,
    JSON.stringify(normalizeResumeOrder(resume)),
  );
}

export function getInitialResume(storage?: Storage): Resume {
  if (!storage) return createEmptyResume();
  const saved = loadResumeFromStorage(storage);
  return saved ?? createEmptyResume();
}
