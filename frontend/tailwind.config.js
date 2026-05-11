/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        farm: {
          bg: "#070b14",
          panel: "#0f1729",
          elevated: "#131c33",
          border: "#1e293b",
          muted: "#94a3b8",
          accent: "#38bdf8",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.25), 0 8px 24px -8px rgba(56,189,248,0.35)",
        "inset-hi": "0 1px 0 0 rgba(255,255,255,0.05) inset",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.8s ease-in-out infinite",
        fadeIn: "fadeIn 160ms ease-out",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
