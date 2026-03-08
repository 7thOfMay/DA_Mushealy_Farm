import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B4332",
          light: "#40916C",
          hover: "#163728",
        },
        bg: {
          page: "#F7F8F6",
          card: "#FFFFFF",
        },
        text: {
          main: "#1A2E1F",
          sub: "#5C7A6A",
        },
        border: {
          DEFAULT: "#E2E8E4",
        },
        alert: {
          danger: "#C0392B",
          warn: "#E67E22",
          ok: "#27AE60",
          data: "#F39C12",
          info: "#2980B9",
        },
      },
      fontFamily: {
        sans: ["'Be Vietnam Pro'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["DM Mono", "monospace"],
        serif: ["Instrument Serif", "serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        "xs": ["0.8125rem", { lineHeight: "1.25rem" }],
        "sm": ["0.9375rem", { lineHeight: "1.5rem" }],
      },
      borderRadius: {
        card: "12px",
        inner: "8px",
        badge: "6px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        focus: "0 0 0 3px rgba(27,67,50,0.12)",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 1.5s infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-in forwards",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200px 0" },
          "100%": { backgroundPosition: "calc(200px + 100%) 0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0", transform: "translateY(8px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
