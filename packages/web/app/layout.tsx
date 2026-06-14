import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resumate — AI 简历构建器",
  description:
    "开源 AI 对话驱动简历构建工具。描述你的经历，AI 自动生成专业简历，可视化编辑器精调，一键导出 PDF。",
  keywords: ["简历", "AI", "简历生成器", "开源", "PDF导出"],
  authors: [{ name: "Resumate" }],
  openGraph: {
    title: "Resumate — AI 简历构建器",
    description:
      "开源 AI 对话驱动简历构建工具。用自然语言生成专业简历。",
    type: "website",
    locale: "zh_CN",
  },
};

import { ApiKeyDialog } from "@/components/api-key-dialog";
import { Outfit, Noto_Sans_SC } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "700"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={cn("dark", outfit.variable, notoSans.variable)}
      suppressHydrationWarning
    >
      <body className="relative min-h-screen bg-background font-sans text-foreground antialiased">
        {/* 跳过导航链接 */}
        <a href="#main-content" className="skip-link">
          跳到主内容
        </a>

        {/* Ethereal 径向光球 · 紫罗兰 + 翡翠 + 鎏金 */}
        <div className="orb-violet" aria-hidden="true" />
        <div className="orb-emerald" aria-hidden="true" />
        <div className="orb-gold" aria-hidden="true" />

        {/* 内容区 */}
        <div id="main-content" className="relative z-10">
          <TooltipProvider>{children}</TooltipProvider>
          <ApiKeyDialog />
        </div>

        {/* Noise 纹理 */}
        <div className="noise-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
