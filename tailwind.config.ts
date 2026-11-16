import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // High-end clean dental clinic palette (exact swatches from design brief)
        dental: {
          cerulean: "#2F8EAC",       // #2F8EAC (Dental Blue / Primary Brand Accent)
          "cerulean-dark": "#24728A",
          "cerulean-light": "#E8F4F8",
          mint: "#BDDBD1",           // #BDDBD1 (Soft Seafoam / Sage Mint)
          "mint-light": "#F0F7F5",
          limestone: "#E7E9E3",      // #E7E9E3 (Warm Architectural Plaster / Subtle Borders)
          porcelain: "#FBF9F1",      // #FBF9F1 (Warm Alabaster Canvas Background)
          mist: "#E8F0F1",           // #E8F0F1 (Clean Clinical Ice Mist / Input Tint)
          ice: "#C7E7EC",            // #C7E7EC (Airy Dental Sky Ice Blue)
          spruce: "#1E2D2B",         // #1E2D2B (Deep Spruce / Forest Charcoal for Typography)
          "spruce-dark": "#14201E",
          slate: "#586B67",          // Muted Secondary Text
        },
        viridian: {
          50: "#E8F0F1",
          100: "#C7E7EC",
          200: "#BDDBD1",
          300: "#9EC6BA",
          400: "#4B9CB5",
          500: "#2F8EAC",
          600: "#287C97",
          700: "#22687F",
          800: "#1F586C",
          900: "#1E2D2B",
          950: "#14201E",
        },
        biomint: {
          DEFAULT: "#2F8EAC",
          glow: "#C7E7EC",
          light: "#E8F0F1",
          dark: "#1E2D2B",
        },
        porcelain: {
          50: "#FFFFFF",
          100: "#FBF9F1",
          200: "#E8F0F1",
          300: "#E7E9E3",
          400: "#D2D6CC",
          500: "#7E8C88",
          900: "#1E2D2B",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
        display: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Space Mono", "monospace"],
      },
      boxShadow: {
        "mint-glow": "0 0 25px -5px rgba(47, 142, 172, 0.35)",
        "viridian-glow": "0 10px 30px -10px rgba(30, 45, 43, 0.35)",
        "card-subtle": "0 1px 3px 0 rgba(30, 45, 43, 0.04), 0 1px 2px -1px rgba(30, 45, 43, 0.04)",
        "card-elevated": "0 10px 25px -5px rgba(30, 45, 43, 0.06), 0 8px 10px -6px rgba(30, 45, 43, 0.04)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

