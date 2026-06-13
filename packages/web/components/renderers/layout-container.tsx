"use client";
import type { LayoutType, ColorTokens, SectionDivider } from "@resumate/shared";
import { buildCSSVars } from "@/lib/templates/template-utils";

interface LayoutContainerProps {
  layout: LayoutType;
  colors: ColorTokens;
  spacing: "compact" | "normal" | "loose";
  sectionDivider: SectionDivider;
  sidebar?: React.ReactNode;
  main?: React.ReactNode;
}

const spacingMap: Record<string, string> = {
  compact: "gap-y-3",
  normal: "gap-y-4",
  loose: "gap-y-6",
};

export function LayoutContainer({
  layout,
  colors,
  spacing,
  sidebar,
  main,
}: LayoutContainerProps) {
  const cssVars = buildCSSVars(colors);
  const gapClass = spacingMap[spacing] || "gap-y-4";

  // Single column
  if (layout === "single-column") {
    return (
      <div className={`flex flex-col ${gapClass}`} style={cssVars}>
        {main}
      </div>
    );
  }

  // Sidebar left
  if (layout === "sidebar-left") {
    return (
      <div className="flex flex-row" style={cssVars}>
        <aside className="w-[35%] shrink-0 pr-4" style={{ color: "#ffffff" }}>
          {sidebar}
        </aside>
        <div className={`flex-1 flex flex-col ${gapClass}`}>{main}</div>
      </div>
    );
  }

  // Sidebar right
  if (layout === "sidebar-right") {
    return (
      <div className="flex flex-row" style={cssVars}>
        <div className={`flex-1 flex flex-col ${gapClass}`}>{main}</div>
        <aside className="w-[35%] shrink-0 pl-4" style={{ color: "#ffffff" }}>
          {sidebar}
        </aside>
      </div>
    );
  }

  // Two column
  return (
    <div className={`grid grid-cols-2 ${gapClass}`} style={cssVars}>
      {main}
    </div>
  );
}
