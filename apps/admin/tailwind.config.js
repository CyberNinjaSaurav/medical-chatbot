/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#4F46E5", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#18181B", foreground: "#FFFFFF" },
        background: "#FAFAFA",
        card: "#FFFFFF",
        heading: "#18181B",
        body: "#52525B",
        danger: "#DC2626",
        border: "#E4E4E7",
        muted: "#F4F4F5",
      },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.06)" },
      fontFamily: {
        sans: ["\"DM Sans\"", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["\"DM Sans\"", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
