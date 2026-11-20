/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "selector",
  content: ["./src/templates/**/*.html", "./components/**/*.tsx", "./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        foreground: "var(--foreground)",
        "muted-foreground": "var(--muted-foreground)",
        background: "var(--notebook-paper)",
      },
      fontFamily: {
        serif: ["Young Serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
