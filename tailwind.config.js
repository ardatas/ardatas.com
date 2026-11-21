/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "selector",
  content: ["./src/templates/**/*.html", "./components/**/*.tsx", "./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        foreground: "var(--foreground)",
        muted: "#f4f4f5",
        "muted-foreground": "var(--muted-foreground)",
        background: "var(--notebook-paper)",
      },
      fontFamily: {
        sans: ["Instrument Sans", "ui-sans-serif", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
