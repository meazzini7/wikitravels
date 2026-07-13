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
        brand: {
          50: "#eff8ff",
          100: "#dbeefe",
          200: "#bfe3fe",
          300: "#93d2fd",
          400: "#60b8fa",
          500: "#3b9df5",
          600: "#2680e8",
          700: "#1f68d1",
          800: "#2054a8",
          900: "#204984",
        },
      },
    },
  },
  plugins: [],
};

export default config;
