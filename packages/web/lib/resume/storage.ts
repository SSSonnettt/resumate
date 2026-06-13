import {
  createEmptyResume,
  loadResume,
  type Resume,
} from "@resumate/shared";

export const RESUME_STORAGE_KEY = "resumate-data";

/**
 * 从 localStorage 加载简历数据，自动检测版本并迁移。
 * v3: 直接加载
 * v2: 自动迁移到 v3
 * v1: 暂不支持
 */
export function loadResumeFromStorage(storage: Storage): Resume | null {
  try {
    const raw = storage.getItem(RESUME_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return loadResume(data);
  } catch (err) {
    console.warn("简历数据加载失败:", err);
    return null;
  }
}

export function saveResumeToStorage(storage: Storage, resume: Resume): void {
  storage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resume));
}

export function getInitialResume(storage?: Storage): Resume {
  if (!storage) return createEmptyResume();
  const saved = loadResumeFromStorage(storage);
  if (saved) {
    // 迁移后立即写回新格式
    saveResumeToStorage(storage, saved);
    return saved;
  }
  return createEmptyResume();
}
