import type { EducationData, Theme } from "@resumate/shared";

export function EducationRenderer({
  data,
  theme,
}: {
  data: EducationData;
  theme: Theme;
}) {
  if (!data.items?.length) return null;
  return (
    <div className="py-2">
      <h2
        className="text-lg font-bold border-b mb-2"
        style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}
      >
        教育背景
      </h2>
      {data.items.map((item, i) => (
        <div key={i} className="mb-2 flex justify-between">
          <div>
            <span className="font-semibold">{item.school}</span>
            <span className="text-gray-500 text-sm ml-2">
              {item.major} · {item.degree}
            </span>
          </div>
          <span className="text-gray-500 text-sm">
            {item.startDate} – {item.endDate || "至今"}
          </span>
        </div>
      ))}
    </div>
  );
}
