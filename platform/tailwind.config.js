/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#10B981",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#F59E0B",
          foreground: "#0F172A",
        },
        background: "#F8FAFC",
        card: "#FFFFFF",
        heading: "#0F172A",
        body: "#64748B",
        danger: "#EF4444",
        border: "#E2E8F0",
        muted: "#F1F5F9",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(15, 23, 42, 0.06)",
        glass: "0 8px 32px rgba(37, 99, 235, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        container: "1280px",
      },
      transitionDuration: {
        page: "200ms",
      },
    },
  },
  plugins: [],
};
