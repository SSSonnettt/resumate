import type { ProjectsData, Theme } from "@ai-resume/shared";

export function ProjectsRenderer({
  data,
  theme,
}: {
  data: ProjectsData;
  theme: Theme;
}) {
  if (!data.items?.length) return null;
  return (
    <div className="py-2">
      <h2
        className="text-lg font-bold border-b mb-2"
        style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}
      >
        项目经历
      </h2>
      {data.items.map((item, i) => (
        <div key={i} className="mb-2">
          <div className="flex justify-between">
            <span className="font-semibold">{item.name}</span>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener"
                className="text-blue-600 text-sm underline"
              >
                链接
              </a>
            )}
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap">
            {item.description}
          </p>
          <div className="flex gap-1 mt-1">
            {item.techStack.map((tech, j) => (
              <span
                key={j}
                className="text-xs bg-gray-200 rounded px-1.5 py-0.5"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
