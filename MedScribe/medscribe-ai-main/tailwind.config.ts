import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        medical: {
          bg: "#f8fafc",
          card: "#ffffff",
          border: "#e2e8f0",
          text: "#0f172a",
          muted: "#64748b",
          accent: "#2563eb",
          success: "#16a34a",
          warning: "#d97706",
          danger: "#dc2626",
          recording: "#b91c1c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        ambient: "0 10px 30px rgba(18, 30, 44, 0.06)",
        lift: "0 24px 60px rgba(20, 38, 60, 0.16)",
      },
      animation: {
        "pulse-recording": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-in": "slideIn 0.45s ease-out",
        "float-soft": "floatSoft 7s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        floatSoft: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
