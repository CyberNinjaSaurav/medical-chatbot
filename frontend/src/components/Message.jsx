function Message({ role, content }) {
  const isUser = role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft sm:max-w-[75%] ${
          isUser
            ? "rounded-br-md bg-user-bubble text-white"
            : "rounded-bl-md bg-bot-bubble text-slate-100"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    </div>
  );
}

export default Message;