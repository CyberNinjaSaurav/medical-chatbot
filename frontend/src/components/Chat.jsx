import { useEffect, useRef, useState } from "react";
import Message from "./Message";

const API_URL = "http://localhost:5000/get";

function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "Hi, I am your medical assistant. Ask me anything about symptoms, medicines, or reports.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ msg: trimmed }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const botText = await response.text();
      setMessages((prev) => [...prev, { role: "bot", content: botText || "No response from server." }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "I could not reach the server. Please confirm Flask is running on http://localhost:5000.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full">
      <aside className="hidden w-72 flex-col border-r border-panel-border bg-slate-950/70 p-4 lg:flex">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Conversations</h2>
        <div className="mt-4 rounded-xl border border-panel-border bg-panel-bg/60 p-3 text-sm text-slate-400">
          New Chat
        </div>
      </aside>

      <main className="flex w-full flex-1 flex-col">
        <header className="border-b border-panel-border bg-panel-bg/70 px-4 py-3 backdrop-blur sm:px-6">
          <h1 className="text-base font-semibold sm:text-lg">Medical AI Chatbot</h1>
        </header>

        <section className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {messages.map((message, index) => (
              <Message key={`${message.role}-${index}`} role={message.role} content={message.content} />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-bot-bubble px-4 py-3 text-sm text-slate-300">
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.25s]" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.1s]" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-slate-300" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </section>

        <footer className="sticky bottom-0 border-t border-panel-border bg-panel-bg/80 px-3 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl items-end gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your message..."
              rows={1}
              disabled={isLoading}
              className="max-h-40 min-h-[48px] flex-1 resize-y rounded-xl border border-panel-border bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="h-12 rounded-xl bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default Chat;