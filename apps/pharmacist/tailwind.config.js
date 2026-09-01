/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#166534", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#14532D", foreground: "#FFFFFF" },
        background: "#FFFBEB",
        card: "#FFFFFF",
        heading: "#14532D",
        body: "#57534E",
        danger: "#B91C1C",
        border: "#E7E5E4",
        muted: "#FEF3C7",
      },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.06)" },
      fontFamily: {
        sans: ["\"Figtree\"", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["\"Literata\"", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
