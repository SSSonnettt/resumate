import type { CustomData } from "@ai-resume/shared";

export function CustomRenderer({ data }: { data: CustomData }) {
  if (!data.content) return null;
  return (
    <div className="py-2">
      {data.title && <h2 className="text-lg font-bold mb-2">{data.title}</h2>}
      <p className="text-sm whitespace-pre-wrap">{data.content}</p>
    </div>
  );
}
