import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glass: "hsl(var(--primary-glass))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "foreground-dim": "hsl(var(--foreground-dim))",
        "foreground-muted": "hsl(var(--foreground-muted))",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-shell)",
        full: "9999px",
      },
      fontWeight: {
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold: "var(--font-weight-bold)",
      },
      letterSpacing: {
        tighter: "var(--tracking-tighter)",
        tight: "var(--tracking-tight)",
        normal: "var(--tracking-normal)",
        wide: "var(--tracking-wide)",
        wider: "var(--tracking-wider)",
      },
      zIndex: {
        base: "var(--z-base)",
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        overlay: "var(--z-overlay)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
        heavy: "var(--glass-blur-heavy)",
      },
      /* ======== Ethereal 动效关键帧 ======== */
      keyframes: {
        /* 渐现上浮 · 模拟质量惯性 */
        "reveal-fade-up": {
          "0%": {
            transform: "translateY(2rem)",
            opacity: "0",
            filter: "blur(4px)",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
            filter: "blur(0)",
          },
        },
        /* 渐现缩小 · 弹窗入场 */
        "reveal-scale": {
          "0%": {
            transform: "scale(0.94)",
            opacity: "0",
            filter: "blur(2px)",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
            filter: "blur(0)",
          },
        },
        /* 水平滑入 · 侧边栏 */
        "reveal-slide-right": {
          "0%": { transform: "translateX(-0.75rem)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "reveal-slide-left": {
          "0%": { transform: "translateX(0.75rem)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        /* 磁悬浮 · 图标平移 */
        "magnetic-hover": {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(2px, -1px) scale(1.05)" },
        },
        /* 辉光呼吸 */
        "glow-breathe": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.75" },
        },
        /* 骨架屏流光 */
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        /* 进度条 · 不确定态 */
        "progress-indeterminate": {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(100%)" },
        },
        /* 边框光晕流转 */
        "border-glow": {
          "0%, 100%": { borderColor: "hsl(43 74% 55% / 0.1)" },
          "50%": { borderColor: "hsl(43 74% 55% / 0.22)" },
        },
        /* 下落浮现 */
        "reveal-fade-down": {
          "0%": { transform: "translateY(-0.75rem)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      /* ======== 自定义缓动曲线 ======== */
      transitionTimingFunction: {
        "spring-out": "cubic-bezier(0.32, 0.72, 0, 1)",
        "spring-in": "cubic-bezier(0.64, 0, 1, 1)",
        "spring-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "glass-smooth": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      animation: {
        "reveal-fade-up": "reveal-fade-up 0.8s cubic-bezier(0.32,0.72,0,1) forwards",
        "reveal-scale": "reveal-scale 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "reveal-slide-right": "reveal-slide-right 0.5s cubic-bezier(0.32,0.72,0,1) forwards",
        "reveal-slide-left": "reveal-slide-left 0.5s cubic-bezier(0.32,0.72,0,1) forwards",
        "reveal-fade-down": "reveal-fade-down 0.5s cubic-bezier(0.32,0.72,0,1) forwards",
        "magnetic-hover": "magnetic-hover 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "glow-breathe": "glow-breathe 4s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "progress-indeterminate": "progress-indeterminate 2s ease-in-out infinite",
        "border-glow": "border-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
