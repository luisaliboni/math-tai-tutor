import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Math TAi Brand Colors
        'mathtai': {
          'chalkboard': '#3d6647',
          'green': '#5a8a63',
          'green-light': '#6b9d76',
          'tan': '#c9a875',
          'tan-light': '#d4b889',
          'red': '#c84a43',
          'beige': '#f5f2ed',
        },
      },
    },
  },
  plugins: [],
};
export default config;
