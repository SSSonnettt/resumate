// A4 标准尺寸（96 DPI 下）
// 210mm × 297mm → 210 * 96 / 25.4 ≈ 794, 297 * 96 / 25.4 ≈ 1123
export const A4_PX = {
  width: 794,   // 210mm
  height: 1123, // 297mm
} as const;

export const PAGE_PADDING = 40; // p-10 = 2.5rem ≈ 40px
export const CONTENT_HEIGHT = A4_PX.height - PAGE_PADDING * 2; // 1043px
