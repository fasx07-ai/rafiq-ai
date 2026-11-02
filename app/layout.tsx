import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "رفيق AI — مساعدك الذكي",
  description: "مساعد ذكاء اصطناعي عربي يساعدك على التفكير والكتابة وفهم ملفاتك.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
