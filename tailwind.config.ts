import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171916",
        paper: "#f6f7f3",
        porcelain: "#fcfbf7",
        graphite: "#343732",
        mineral: "#6f8f82",
        brass: "#9b7446",
        canyon: "#a9654f",
        night: "#101315",
        moss: "#486b5b",
        signal: "#b85a50"
      },
      boxShadow: {
        soft: "0 18px 58px rgba(22, 24, 20, 0.09)",
        story: "0 28px 90px rgba(0, 0, 0, 0.34)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
