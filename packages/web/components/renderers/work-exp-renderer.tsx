import type { WorkExperienceData, Theme } from "@resumate/shared";

interface Props {
  data: WorkExperienceData;
  theme: Theme;
}

export function WorkExperienceRenderer({ data, theme }: Props) {
  if (!data.items?.length) return null;
  return (
    <div className="py-2">
      <h2
        className="text-lg font-bold border-b mb-2"
        style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}
      >
        工作经历
      </h2>
      {data.items.map((item, i) => (
        <div key={i} className="mb-3">
          <div className="flex justify-between">
            <span className="font-semibold">
              {item.position} @ {item.company}
            </span>
            <span className="text-gray-500 text-sm">
              {item.startDate} – {item.endDate || "至今"}
            </span>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}
