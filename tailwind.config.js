/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "selector",
  content: ["./src/templates/**/*.html", "./components/**/*.tsx", "./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        foreground: "var(--foreground)",
        primary: { DEFAULT: "#284d6d", foreground: "#ffffff" },
        secondary: { DEFAULT: "#e2ebf3", foreground: "#101114" },
        destructive: { DEFAULT: "#b42318", foreground: "#ffffff" },
        accent: { DEFAULT: "#dce7f0", foreground: "#19364c" },
        input: "var(--notebook-border)",
        border: "var(--notebook-border)",
        ring: "#315f87",
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
