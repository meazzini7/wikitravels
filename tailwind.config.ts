import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
      },
    },
  },
  plugins: [],
};

export default config;
