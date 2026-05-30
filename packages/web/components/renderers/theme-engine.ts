import type { Theme } from "@ai-resume/shared";

const fontSizeMap = { small: "12px", medium: "14px", large: "16px" };
const spacingMap = { compact: "4px", normal: "8px", loose: "16px" };

export function themeToCSS(theme: Theme): React.CSSProperties {
  return {
    "--primary-color": theme.primaryColor,
    "--font-family": fontFamilyToCSS(theme.fontFamily),
    "--font-size": fontSizeMap[theme.fontSize],
    "--spacing": spacingMap[theme.spacing],
  } as React.CSSProperties;
}

function fontFamilyToCSS(f: Theme["fontFamily"]): string {
  switch (f) {
    case "sans":
      return "system-ui, -apple-system, sans-serif";
    case "serif":
      return "Georgia, 'Times New Roman', serif";
    case "kai":
      return "KaiTi, '楷体', STKaiti, serif";
  }
}
