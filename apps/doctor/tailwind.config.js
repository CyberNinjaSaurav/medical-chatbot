/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#1A7A6D", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#0B1F3A", foreground: "#FFFFFF" },
        background: "#F4F6F8",
        card: "#FFFFFF",
        heading: "#0B1F3A",
        body: "#4A5568",
        danger: "#C53030",
        border: "#D5DCE5",
        muted: "#E8EEF4",
      },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.06)" },
      fontFamily: {
        sans: ["\"IBM Plex Sans\"", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["\"Source Serif 4\"", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
