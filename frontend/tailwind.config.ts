import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        dark: {
          DEFAULT: '#1e1e1e',
          lighter: '#2a2a2a',
          navbar: '#1f1f1f',
          border: '#333333',
        },
        // Brand colors
        brand: {
          blue: '#3b82f6',
          indigo: '#6366f1',
          purple: '#8b5cf6',
        },
      },
    },
  },
  plugins: [],
};

export default config;
