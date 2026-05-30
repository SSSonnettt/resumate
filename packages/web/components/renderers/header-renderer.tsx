import type { HeaderData, Theme } from "@ai-resume/shared";

interface Props {
  data: HeaderData;
  theme: Theme;
}

export function HeaderRenderer({ data, theme }: Props) {
  return (
    <div
      className="py-4 flex justify-between items-end"
      style={{ color: theme.primaryColor }}
    >
      <div>
        <h1 className="text-2xl font-bold">{data.name || "姓名"}</h1>
        <p className="text-lg mt-1">{data.jobTitle || "职位"}</p>
      </div>
      <div className="text-sm space-y-1">
        {data.contacts?.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <span>{c.icon}</span>
            {c.link ? (
              <a
                href={c.link}
                target="_blank"
                rel="noopener"
                className="underline"
              >
                {c.text}
              </a>
            ) : (
              <span>{c.text}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
