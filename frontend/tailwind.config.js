/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        farm: {
          bg: "#0b1220",
          panel: "#111827",
          border: "#1f2937",
          accent: "#38bdf8",
        },
      },
    },
  },
  plugins: [],
};
