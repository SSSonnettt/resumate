import type { SummaryData } from "@ai-resume/shared";

export function SummaryRenderer({ data }: { data: SummaryData }) {
  if (!data.text) return null;
  return (
    <div className="py-2">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {data.text}
      </p>
    </div>
  );
}
