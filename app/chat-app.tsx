"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: number };
const STORAGE_KEY = "rafiq-ai-conversations-v1";
const suggestions = [
  { icon: "✦", title: "اكتب لي رسالة احترافية", text: "اكتب لي رسالة احترافية أطلب فيها تأجيل موعد اجتماع" },
  { icon: "⌘", title: "لخّص فكرة معقدة", text: "اشرح لي الذكاء الاصطناعي التوليدي بطريقة بسيطة" },
  { icon: "◌", title: "خطط لأسبوعي", text: "ساعدني في وضع خطة أسبوعية متوازنة للعمل والتعلّم" },
  { icon: "↗", title: "حلّل ملفًا", text: "لخّص أهم النقاط في الملف الذي أرفقته" },
];

function makeConversation(): Conversation {
  return { id: crypto.randomUUID(), title: "محادثة جديدة", messages: [], updatedAt: Date.now() };
}

export function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileContext, setFileContext] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as Conversation[]) : [];
      if (parsed.length) {
        setConversations(parsed);
        setActiveId(parsed[0].id);
      } else {
        const initial = makeConversation();
        setConversations([initial]);
        setActiveId(initial.id);
      }
    } catch {
      const initial = makeConversation();
      setConversations([initial]);
      setActiveId(initial.id);
    }
  }, []);

  useEffect(() => {
    if (conversations.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [activeId, conversations, busy]);

  const active = conversations.find((conversation) => conversation.id === activeId);
  const messages = active?.messages ?? [];

  function updateMessages(id: string, nextMessages: Message[]) {
    setConversations((current) => current.map((conversation) => {
      if (conversation.id !== id) return conversation;
      const firstUser = nextMessages.find((message) => message.role === "user")?.content ?? "محادثة جديدة";
      return { ...conversation, messages: nextMessages, title: firstUser.slice(0, 30), updatedAt: Date.now() };
    }));
  }

  function newChat() {
    const conversation = makeConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setInput("");
    setFileContext("");
    setFileName("");
    setSidebarOpen(false);
  }

  async function sendMessage(event?: FormEvent, prompt?: string) {
    event?.preventDefault();
    const content = (prompt ?? input).trim();
    if (!content || busy || !active) return;
    const conversationId = active.id;
    const nextMessages: Message[] = [...active.messages, { role: "user", content }];
    updateMessages(conversationId, nextMessages);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, fileContext }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر الحصول على رد. حاول مرة أخرى.");
      updateMessages(conversationId, [...nextMessages, { role: "assistant", content: data.reply ?? "لم يصل رد." }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
      updateMessages(conversationId, [...nextMessages, { role: "assistant", content: `تعذّر إكمال الطلب: ${message}` }]);
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(file?: File) {
    if (!file) return;
    setFileBusy(true);
    setNotice("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await response.json()) as { text?: string; fileName?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر قراءة الملف.");
      setFileContext(data.text ?? "");
      setFileName(data.fileName ?? file.name);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر قراءة الملف.");
    } finally {
      setFileBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">ر</div>
          <span className="brand-name">رفيق <span>AI</span></span>
          <button className="icon-button mobile-close" aria-label="إغلاق القائمة" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        <button className="new-chat-button" onClick={newChat}><span>＋</span> محادثة جديدة</button>
        <div className="history-label">محادثاتك</div>
        <nav className="conversation-list" aria-label="المحادثات السابقة">
          {conversations.map((conversation) => (
            <button key={conversation.id} className={`conversation-item ${conversation.id === activeId ? "selected" : ""}`} onClick={() => { setActiveId(conversation.id); setSidebarOpen(false); }}>
              <span className="conversation-icon">◷</span><span className="conversation-title">{conversation.title}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-avatar">م</div>
          <div className="profile-copy"><strong>مرحبًا بك</strong><span>مساحة شخصية</span></div>
          <span className="more-icon">···</span>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="فتح القائمة" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="model-pill"><span className="status-dot" /> رفيق الذكي <span className="chevron">⌄</span></div>
          <button className="share-button" onClick={() => { void navigator.clipboard?.writeText(window.location.href); setNotice("تم نسخ رابط الصفحة"); }}>↗ <span>مشاركة</span></button>
        </header>

        <div className={`chat-area ${messages.length ? "has-messages" : ""}`}>
          {messages.length === 0 ? (
            <div className="welcome-block">
              <div className="welcome-orb"><span>✦</span></div>
              <p className="eyebrow">مساحتك للتفكير والإبداع</p>
              <h1>أهلًا بك، كيف أقدر <span>أساعدك؟</span></h1>
              <p className="welcome-subtitle">اسأل، اكتب، تعلّم — أنا هنا لأجعل يومك أسهل.</p>
              <div className="suggestion-grid">
                {suggestions.map((suggestion) => (
                  <button className="suggestion-card" key={suggestion.title} onClick={() => void sendMessage(undefined, suggestion.text)}>
                    <span className="suggestion-icon">{suggestion.icon}</span><strong>{suggestion.title}</strong><span className="suggestion-arrow">↗</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message, index) => (
                <article className={`message-row ${message.role}`} key={`${activeId}-${index}`}>
                  {message.role === "assistant" && <div className="assistant-avatar">ر</div>}
                  <div className="message-content">
                    <div className="message-author">{message.role === "user" ? "أنت" : "رفيق"}</div>
                    <p>{message.content}</p>
                  </div>
                </article>
              ))}
              {busy && <div className="message-row assistant"><div className="assistant-avatar">ر</div><div className="typing-indicator"><i /><i /><i /></div></div>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="composer-wrap">
          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
          {fileName && <div className="file-chip"><span>▤</span><span>{fileName}</span><button aria-label="إزالة الملف" onClick={() => { setFileName(""); setFileContext(""); }}>×</button></div>}
          <form className="composer" onSubmit={(event) => void sendMessage(event)}>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onInputKeyDown} placeholder="اكتب رسالتك هنا..." rows={1} aria-label="رسالتك" />
            <div className="composer-actions">
              <div className="composer-tools">
                <button type="button" className="tool-button" title="إرفاق ملف" aria-label="إرفاق ملف" onClick={() => fileRef.current?.click()} disabled={fileBusy}><span>{fileBusy ? "◌" : "＋"}</span></button>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(event) => void uploadFile(event.target.files?.[0])} />
                <span className="tool-hint">{fileBusy ? "جارٍ تجهيز الملف..." : "أرفق ملفًا"}</span>
              </div>
              <div className="send-controls"><span className="enter-hint">↵ للإرسال</span><button className="send-button" type="submit" disabled={!input.trim() || busy} aria-label="إرسال الرسالة">↑</button></div>
            </div>
          </form>
          <p className="disclaimer">قد يخطئ رفيق أحيانًا. تحقّق من المعلومات المهمة.</p>
        </div>
      </section>
    </main>
  );
}
