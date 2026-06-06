import type { SkillsData, Theme } from "@resumate/shared";

export function SkillsRenderer({
  data,
  theme,
}: {
  data: SkillsData;
  theme: Theme;
}) {
  if (!data.categories?.length) return null;
  return (
    <div className="py-2">
      <h2
        className="text-lg font-bold border-b mb-2"
        style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}
      >
        技能
      </h2>
      {data.categories.map((cat, i) => (
        <div key={i} className="mb-2">
          <span className="text-sm font-semibold">{cat.name}：</span>
          {cat.tags.map((tag, j) => (
            <span
              key={j}
              className="inline-block text-xs bg-gray-100 rounded px-2 py-0.5 mr-1 mb-1"
            >
              {tag}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
