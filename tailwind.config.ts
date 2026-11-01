import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        "2xl": "12px",
      },
      colors: {
        gray: {
          50: "#f7f8f4",
          100: "#eef1ea",
          200: "#dce1d9",
          300: "#c5cdc3",
          400: "#7b877d",
          500: "#647067",
          600: "#59645d",
          700: "#3d4b41",
          800: "#2e3d33",
          900: "#1c2923",
          950: "#142219",
        },
        primary: {
          50: "#edf3eb",
          100: "#dce9dc",
          200: "#b7d1b8",
          300: "#8fb797",
          400: "#609374",
          500: "#39725a",
          600: "#245b45",
          700: "#194431",
          800: "#153929",
          900: "#102c20",
          950: "#0c2118",
        },
        accent: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
