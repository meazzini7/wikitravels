import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      typography: ({ theme }: { theme: (path: string) => string }) => ({
        brand: {
          css: {
            "--tw-prose-headings": theme("colors.brand[700]"),
            "--tw-prose-links": theme("colors.brand[600]"),
            "--tw-prose-bold": theme("colors.gray[900]"),
            "--tw-prose-bullets": theme("colors.brand[400]"),
            "--tw-prose-quotes": theme("colors.brand[700]"),
            "--tw-prose-quote-borders": theme("colors.brand[200]"),
          },
        },
      }),
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 10px -2px rgb(0 0 0 / 0.08), 0 8px 24px -8px rgb(221 33 102 / 0.12)",
        pop: "0 4px 14px -2px rgb(221 33 102 / 0.35)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      colors: {
        // Rosa fenicottero: colore guida del brand WikiTravels.
        brand: {
          50: "#fff1f5",
          100: "#ffe1ea",
          200: "#ffc2d6",
          300: "#ff94b8",
          400: "#fb6a9c",
          500: "#f13e7e",
          600: "#dd2166",
          700: "#ba1553",
          800: "#981549",
          900: "#7f1541",
        },
        // Turchese laguna: accento secondario per badge, link e highlight.
        lagoon: {
          50: "#eefcfb",
          100: "#d4f5f2",
          200: "#aeebe6",
          300: "#78dad4",
          400: "#43bfba",
          500: "#28a19d",
          600: "#1f807e",
          700: "#1e6666",
          800: "#1d5252",
          900: "#1a4546",
        },
        // Giallo tramonto: terzo accento per badge/gamification e highlight caldi.
        sun: {
          50: "#fffbeb",
          100: "#fff3c4",
          200: "#ffe58a",
          300: "#ffd24d",
          400: "#ffbe1f",
          500: "#f7a70a",
          600: "#d98505",
          700: "#b3650a",
          800: "#8f4f10",
          900: "#763f11",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
