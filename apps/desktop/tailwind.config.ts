import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter var",
          "Inter",
          "SF Pro Text",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: ["Inter Display", "Inter var", "SF Pro Display", "system-ui", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "Menlo",
          "ui-monospace",
          "monospace",
        ],
      },
      colors: {
        ink: {
          900: "#0A0B0F",
          800: "#0F1117",
          700: "#161924",
          600: "#1D2030",
          500: "#262A3E",
        },
        fog: {
          500: "#7780A8",
          300: "#A3ABC7",
        },
        iris: {
          DEFAULT: "#7C5CFF",
          deep: "#5B3CDB",
        },
        cyan: { brand: "#5DE0E6" },
        amber: { brand: "#FFB454" },
        rose: { brand: "#FF6F91" },
        success: "#3DDC97",
        warning: "#FFB454",
        danger: "#FF5D6C",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "16px",
        xl: "22px",
      },
      boxShadow: {
        hairline: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        panel:
          "0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 60px -10px rgba(8,10,30,0.45), 0 12px 30px -6px rgba(8,10,30,0.35)",
        pop: "0 10px 30px -8px rgba(8,10,30,0.45)",
      },
      backdropBlur: { glass: "24px" },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
        breathe: "breathe 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
