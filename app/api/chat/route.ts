import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "أضف مفتاح OPENAI_API_KEY إلى ملف .env.local لتفعيل المساعد." }, { status: 503 });

  try {
    const body = (await request.json()) as { messages?: ChatMessage[]; fileContext?: string };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "أرسل رسالة واحدة على الأقل." }, { status: 400 });
    }
    const messages = body.messages.slice(-20).map((message) => {
      if (!["user", "assistant"].includes(message.role) || typeof message.content !== "string") {
        throw new Error("صيغة الرسائل غير صالحة.");
      }
      return { role: message.role, content: message.content.slice(0, 12_000) };
    });
    const fileContext = typeof body.fileContext === "string" ? body.fileContext.slice(0, 60_000) : "";
    const systemPrompt = `أنت رفيق، مساعد ذكاء اصطناعي ودود ومفيد. أجب باللغة التي يستخدمها المستخدم، واجعل العربية طبيعية وواضحة. إذا أُرفق محتوى ملف، استخدمه للإجابة عن أسئلة المستخدم واذكر بوضوح إن لم تكن الإجابة موجودة فيه.\n\n${fileContext ? `محتوى الملف المرفق:\n${fileContext}` : "لا يوجد ملف مرفق."}`;
    const upstream = await fetch(`${(process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, ...messages], temperature: 0.7 }),
    });
    const result = (await upstream.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    if (!upstream.ok) {
      console.error("AI provider error", result.error?.message ?? upstream.statusText);
      return NextResponse.json({ error: "تعذر الاتصال بمزوّد الذكاء الاصطناعي. تحقق من الإعدادات وحاول مجددًا." }, { status: 502 });
    }
    const reply = result.choices?.[0]?.message?.content;
    if (!reply) return NextResponse.json({ error: "لم يصل رد من المزوّد." }, { status: 502 });
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر معالجة الطلب." }, { status: 400 });
  }
}
