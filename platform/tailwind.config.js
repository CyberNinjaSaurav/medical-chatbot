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
          DEFAULT: "#0E9F7A",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#8B7CF6",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#FF8A65",
          foreground: "#1A1A1A",
        },
        background: "#F7F4EF",
        card: "#FFFFFF",
        heading: "#17141F",
        body: "#5C5868",
        danger: "#EF4444",
        border: "#E8E2D9",
        muted: "#F3EEE7",
        mint: "#D8F5EA",
        lavender: "#E8E4FB",
        peach: "#FFE3D6",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        soft: "0 12px 40px rgba(23, 20, 31, 0.06)",
        glass: "0 16px 48px rgba(14, 159, 122, 0.10)",
        lift: "0 22px 50px rgba(139, 124, 246, 0.16)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        container: "1280px",
      },
      transitionDuration: {
        page: "200ms",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-18px) rotate(8deg)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(14px) scale(1.04)" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
