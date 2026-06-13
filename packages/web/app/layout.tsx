import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resume Builder",
  description: "AI 对话驱动的开源简历构建工具",
};

import { ApiKeyDialog } from "@/components/api-key-dialog";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={cn("dark font-sans", geist.variable)} suppressHydrationWarning>
      <body className="relative min-h-screen bg-background text-foreground antialiased">
        {/* 环境光晕 */}
        <div
          className="pointer-events-none fixed inset-0 z-0"
          aria-hidden="true"
        >
          <div className="glow-primary absolute inset-0" />
          <div className="glow-secondary absolute inset-0" />
        </div>

        {/* 内容区 */}
        <div className="relative z-10">
          <TooltipProvider>{children}</TooltipProvider>
          <ApiKeyDialog />
        </div>

        {/* Noise 纹理 */}
        <div className="noise-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
