/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#D97706", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#1C1917", foreground: "#FFFFFF" },
        background: "#F5F5F4",
        card: "#FFFFFF",
        heading: "#1C1917",
        body: "#57534E",
        danger: "#DC2626",
        border: "#D6D3D1",
        muted: "#E7E5E4",
      },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.06)" },
      fontFamily: {
        sans: ["\"Space Grotesk\"", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["\"Space Grotesk\"", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
