import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RESUMATE — AI 简历构建系统",
  description:
    "开源 AI 对话驱动简历构建工具。描述你的经历，AI 自动生成专业简历，可视化编辑器精调，一键导出 PDF。",
  keywords: ["简历", "AI", "简历生成器", "开源", "PDF导出"],
  authors: [{ name: "Resumate" }],
  openGraph: {
    title: "RESUMATE — AI 简历构建系统",
    description:
      "开源 AI 对话驱动简历构建工具。用自然语言生成专业简历。",
    type: "website",
    locale: "zh_CN",
  },
};

import { ApiKeyDialog } from "@/components/api-key-dialog";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
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
      className={cn(inter.variable, jetbrainsMono.variable)}
      suppressHydrationWarning
    >
      <body className="relative min-h-screen bg-background font-mono text-foreground antialiased">
        {/* 跳过导航链接 */}
        <a href="#main-content" className="skip-link">
          [ SKIP TO CONTENT ]
        </a>

        {/* 内容区 */}
        <div id="main-content" className="relative z-10">
          <TooltipProvider>{children}</TooltipProvider>
          <ApiKeyDialog />
        </div>
      </body>
    </html>
  );
}
