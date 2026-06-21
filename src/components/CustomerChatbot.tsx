import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { createServerFn } from "@tanstack/react-start";

// ─── Server Function: Query Tavily and Groq securely on the server ───────────
const askBotFn = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; history: { role: string; content: string }[] }) => d)
  .handler(
    async ({ data }: { data: { text: string; history: { role: string; content: string }[] } }) => {
      const { text, history } = data;

      // 1. Fetch Search Context from Tavily
      const tavilyKey =
        process.env.VITE_TAVILY_API_KEY || import.meta.env.VITE_TAVILY_API_KEY || "";

      let searchContext = "";
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: text,
            search_depth: "basic",
            include_answer: true,
          }),
        });
        if (res.ok) {
          const resData = await res.json();
          searchContext =
            resData.answer || resData.results?.map((r: any) => r.content).join("\n") || "";
        }
      } catch (err) {
        console.error("Tavily search failed on server:", err);
      }

      // 2. Fetch Chat Completion from OpenRouter
      const openRouterKey =
        process.env.OPENROUTER_API_KEY ||
        (import.meta as any).env?.VITE_OPENROUTER_API_KEY ||
        "";

      const messages = [
        {
          role: "system",
          content:
            "You are a friendly assistant for OdooCafé, an Indian restaurant. Help customers with general questions about food, pricing, dietary info, and anything else. Keep answers short and helpful. Prices are in Indian Rupees (₹). Use the provided search context to answer accurately. If the user asks about navigation, guide them based on the context or your knowledge.",
        },
      ];

      if (searchContext) {
        messages.push({
          role: "system",
          content: `Search context from web search:\n${searchContext}`,
        });
      }

      // Add recent history messages
      messages.push(...history);

      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
            "HTTP-Referer": "http://localhost:8080",
            "X-Title": "OdooCafé",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.2-3b-instruct",
            messages,
            max_tokens: 300,
            temperature: 0.7,
          }),
        });

        if (!res.ok) throw new Error(`OpenRouter API error status: ${res.status}`);
        const resData = await res.json();
        return (
          resData.choices?.[0]?.message?.content ??
          "Sorry, I couldn't get a response. Please try again."
        );
      } catch (err) {
        console.error("OpenRouter API failed on server:", err);
        return "Sorry, I had trouble connecting to the AI service. Please try again later.";
      }
    },
  );

interface Message {
  role: "assistant" | "user";
  text: string;
  loading?: boolean;
}

export function CustomerChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "👋 Hi there! Welcome to OdooCafé! I'm here to help you navigate the app, explore the menu, or answer any questions you have. What can I do for you today?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);

    // Get dialog history
    const history = [...messages, userMsg]
      .filter((m) => !m.loading)
      .map((m) => ({ role: m.role, content: m.text }));

    try {
      const answer = await askBotFn({ data: { text, history } });
      setLoading(false);
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (err) {
      console.error("Chatbot query failed:", err);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I had trouble connecting to my knowledge base. Please try asking again.",
        },
      ]);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Simple markdown bold parser: **text** → <strong>text</strong>
  function renderText(text: string) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: "oklch(0.1 0.005 264)", color: "oklch(0.974 0.005 85)" }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[520px] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: "oklch(0.974 0.005 85)", border: "1px solid oklch(0.88 0.01 80)" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ background: "oklch(0.1 0.005 264)", color: "oklch(0.974 0.005 85)" }}
          >
            <Bot className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold text-sm">OdooCafé Assistant</div>
              <div className="text-[11px] opacity-70">Here to help</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 360 }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className="h-7 w-7 rounded-full shrink-0 grid place-items-center text-xs font-bold"
                  style={
                    msg.role === "assistant"
                      ? { background: "oklch(0.93 0.008 80)", color: "oklch(0.1 0.005 264)" }
                      : { background: "oklch(0.1 0.005 264)", color: "oklch(0.974 0.005 85)" }
                  }
                >
                  {msg.role === "assistant" ? (
                    <Bot className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className="max-w-[260px] rounded-xl px-3 py-2 text-sm leading-relaxed"
                  style={
                    msg.role === "assistant"
                      ? { background: "oklch(0.955 0.006 80)", color: "oklch(0.1 0.005 264)" }
                      : { background: "oklch(0.1 0.005 264)", color: "oklch(0.974 0.005 85)" }
                  }
                >
                  {renderText(msg.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-start">
                <div
                  className="h-7 w-7 rounded-full shrink-0 grid place-items-center"
                  style={{ background: "oklch(0.93 0.008 80)" }}
                >
                  <Bot className="h-3.5 w-3.5" style={{ color: "oklch(0.1 0.005 264)" }} />
                </div>
                <div
                  className="rounded-xl px-3 py-2 text-sm"
                  style={{ background: "oklch(0.955 0.006 80)", color: "oklch(0.45 0.01 264)" }}
                >
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce delay-0">·</span>
                    <span className="animate-bounce delay-150">·</span>
                    <span className="animate-bounce delay-300">·</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-3 border-t"
            style={{ borderColor: "oklch(0.88 0.01 80)" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything…"
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: "oklch(0.99 0.003 85)",
                border: "1px solid oklch(0.85 0.01 264)",
                color: "oklch(0.1 0.005 264)",
              }}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-lg flex items-center justify-center transition hover:opacity-80 disabled:opacity-40"
              style={{ background: "oklch(0.1 0.005 264)", color: "oklch(0.974 0.005 85)" }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
