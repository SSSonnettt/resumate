import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

// pdf-parse v2 的 ESM + worker 架构与 Next.js webpack 不兼容，
// 改用 pdfreader（纯 JS，无 worker 依赖）
function loadPdfReader() {
  return require("pdfreader") as typeof import("pdfreader");
}

function loadMammoth() {
  return require("mammoth") as typeof import("mammoth");
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "text/plain",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  let tmpPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "未找到上传文件，请确保字段名为 file" },
        { status: 400 },
      );
    }

    // 校验文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），上限 10MB` },
        { status: 400 },
      );
    }

    // 校验文件类型
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== "") {
      // 某些系统 .docx 的 MIME 可能为空，用扩展名兜底
      const ext = file.name.toLowerCase().match(/\.\w+$/)?.[0];
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `不支持的文件格式：${file.type || ext || "未知"}，支持 PDF、DOCX、TXT` },
          { status: 400 },
        );
      }
    }

    // 写入临时文件
    const buffer = Buffer.from(await file.arrayBuffer());
    tmpPath = join(tmpdir(), `resumate-upload-${randomUUID()}`);
    await writeFile(tmpPath, buffer);

    let text: string;
    const ext = file.name.toLowerCase().match(/\.\w+$/)?.[0] || "";

    if (ext === ".pdf") {
      text = await parsePDF(tmpPath);
    } else if (ext === ".docx" || ext === ".doc") {
      text = await parseDocx(tmpPath);
    } else if (ext === ".txt") {
      text = readFileSync(tmpPath, "utf-8");
    } else {
      return NextResponse.json(
        { error: `不支持的文件扩展名：${ext}，支持 PDF、DOCX、TXT` },
        { status: 400 },
      );
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "文件解析结果为空，请确认文件包含可提取的文本内容" },
        { status: 400 },
      );
    }

    // 截断过长文本（防止 token 溢出）
    const MAX_CHARS = 8000;
    const truncated = text.length > MAX_CHARS
      ? text.slice(0, MAX_CHARS) + `\n\n[文本过长，已截断前 ${MAX_CHARS} 字符]`
      : text;

    return NextResponse.json({
      text: truncated,
      fileName: file.name,
      charCount: text.length,
      truncated: text.length > MAX_CHARS,
    });
  } catch (err) {
    console.error("文件上传解析失败:", err);
    return NextResponse.json(
      { error: `文件解析失败：${err instanceof Error ? err.message : "未知错误"}` },
      { status: 500 },
    );
  } finally {
    // 清理临时文件
    if (tmpPath) {
      unlink(tmpPath).catch(() => {});
    }
  }
}

async function parsePDF(filePath: string): Promise<string> {
  const { PdfReader } = loadPdfReader();
  const lines: string[] = [];
  let settled = false;

  return new Promise((resolve, reject) => {
    // 超时保护：30 秒后强制结束
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (lines.length > 0) {
        resolve(lines.join("\n"));
      } else {
        reject(new Error("PDF 解析超时（30 秒），文件可能已损坏或包含扫描图片"));
      }
    }, 30000);

    new PdfReader().parseFileItems(filePath, (err, item) => {
      if (settled) return;

      // v3 pdfreader: 错误可能通过 item.parserError 传递
      if (item && (item as Record<string, unknown>).parserError) {
        settled = true;
        clearTimeout(timeout);
        const msg = (item as Record<string, unknown>).parserError;
        reject(new Error(`PDF 解析失败：${msg}`));
        return;
      }

      if (err) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`PDF 解析失败：${typeof err === "string" ? err : JSON.stringify(err)}`));
        return;
      }

      if (!item) {
        // 解析完成
        settled = true;
        clearTimeout(timeout);
        resolve(lines.join("\n"));
        return;
      }

      if (item.text) {
        lines.push(item.text);
      }
    });
  });
}

async function parseDocx(filePath: string): Promise<string> {
  const mammoth = loadMammoth();
  const buffer = readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}
