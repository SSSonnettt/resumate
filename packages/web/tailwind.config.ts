import type { Config } from "tailwindcss";

export default {
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
        xs: "0",
        sm: "0",
        DEFAULT: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "0",
      },
      fontWeight: {
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold: "var(--font-weight-bold)",
        black: "var(--font-weight-black)",
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
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        display: ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
      },
      /* ======== Industrial Brutalist 动效关键帧 ======== */
      keyframes: {
        /* 光标闪烁 */
        "blink-cursor": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        /* 字符逐字揭示 */
        "char-reveal": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        /* 删除线扫描 */
        "strike-through": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        /* 扫描线揭示 */
        "scanline-reveal": {
          "0%": { clipPath: "inset(0 0 100% 0)" },
          "100%": { clipPath: "inset(0 0 0% 0)" },
        },
        /* 盖章式按入 */
        "stamp-down": {
          "0%": { transform: "scale(1.1)", opacity: "0" },
          "60%": { transform: "scale(0.97)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        /* 进度条脉冲 */
        "pulse-hard": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "blink-cursor": "blink-cursor 1s step-end infinite",
        "char-reveal": "char-reveal 0.3s ease-out forwards",
        "strike-through": "strike-through 0.6s ease-out forwards",
        "scanline-reveal": "scanline-reveal 0.8s ease-out forwards",
        "stamp-down": "stamp-down 0.4s ease-out forwards",
        "pulse-hard": "pulse-hard 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
