import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const WELCOME = {
  role: "bot",
  text: "Hi! I'm the HackHub Assistant. Ask me anything about using the platform — registering, joining a hackathon, submitting a project, judging, the leaderboard, or anything else.",
};

export function FaqChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setSending(true);
    try {
      const data = await api.post("/api/faq-chat", { message: text });
      setMessages((m) => [...m, { role: "bot", text: data?.answer || "Sorry, I couldn't generate an answer." }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, something went wrong reaching the assistant. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 sm:w-96 h-[28rem] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-[#1f3a68] text-white px-4 py-3 flex items-center justify-between">
            <span className="font-bold text-sm">💬 HackHub Assistant</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[#f4f7fc]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-[#5B8FCF] text-white" : "bg-white border text-gray-800"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-lg px-3 py-2 text-sm text-gray-500 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t p-2 flex gap-2 bg-white">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask a question…"
              className="flex-1 resize-none rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button
              onClick={send}
              disabled={sending || !draft.trim()}
              className="bg-[#5B8FCF] text-white text-sm font-semibold rounded px-3 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-[#5B8FCF] text-white text-2xl shadow-lg flex items-center justify-center hover:opacity-90"
        title="HackHub Assistant"
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}
