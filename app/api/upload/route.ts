import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 60_000;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "لم يتم استلام ملف." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "حجم الملف يتجاوز الحد المسموح (5 ميغابايت)." }, { status: 413 });

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = buffer.toString("utf8");
    } else if (name.endsWith(".pdf")) {
      const pdf = (await import("pdf-parse")).default;
      text = (await pdf(buffer)).text;
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer })).value;
    } else {
      return NextResponse.json({ error: "الصيغ المدعومة: PDF وDOCX وTXT وMarkdown." }, { status: 415 });
    }

    text = text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
    if (!text) return NextResponse.json({ error: "لم أجد نصًا قابلًا للقراءة في الملف." }, { status: 422 });
    return NextResponse.json({ text, fileName: file.name });
  } catch (error) {
    console.error("File extraction failed", error);
    return NextResponse.json({ error: "تعذرت قراءة الملف. تأكد من سلامته وحاول مجددًا." }, { status: 500 });
  }
}
