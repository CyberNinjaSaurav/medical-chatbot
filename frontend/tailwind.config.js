/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "app-bg": "#0b1020",
        "panel-bg": "#111827",
        "panel-border": "#1f2937",
        "user-bubble": "#2563eb",
        "bot-bubble": "#1f2937",
      },
      boxShadow: {
        soft: "0 12px 30px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};