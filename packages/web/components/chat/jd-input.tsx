"use client";
import { useState } from "react";

export function JDInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [jdText, setJdText] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div className="mb-4">
      {!show ? (
        <button
          onClick={() => setShow(true)}
          className="text-sm text-blue-600 underline"
        >
          粘贴职位描述(JD)优化简历
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="粘贴职位描述..."
            rows={4}
            className="w-full rounded border p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSubmit(jdText);
                setJdText("");
                setShow(false);
              }}
              className="rounded bg-blue-600 px-4 py-1 text-sm text-white"
            >
              提交
            </button>
            <button
              onClick={() => setShow(false)}
              className="rounded border px-4 py-1 text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
