import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        "rating-press": "rating-press 360ms cubic-bezier(0.22, 1, 0.36, 1)",
        "rating-card-again": "rating-card-again 520ms ease-out",
        "rating-card-hard": "rating-card-hard 520ms ease-out",
        "rating-card-good": "rating-card-good 520ms ease-out",
        "rating-card-easy": "rating-card-easy 520ms ease-out",
        "fade-in": "fade-in 200ms ease-out both",
        "slide-up": "slide-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up-delay-1": "slide-up 280ms 80ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up-delay-2": "slide-up 280ms 160ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up-delay-3": "slide-up 280ms 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      colors: {
        cream: "#FDFCF0",
        emeraldSacred: "#064E3B",
        goldSubtle: "#BFA76A",
      },
      keyframes: {
        "rating-press": {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(0.94)" },
          "68%": { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)" },
        },
        "rating-card-again": {
          "0%": {
            boxShadow: "0 20px 60px -32px rgba(6,78,59,0.45)",
            borderColor: "rgba(6,78,59,0.15)",
          },
          "45%": {
            boxShadow: "0 26px 72px -28px rgba(190,24,93,0.38)",
            borderColor: "rgba(190,24,93,0.45)",
          },
          "100%": {
            boxShadow: "0 20px 60px -32px rgba(6,78,59,0.45)",
            borderColor: "rgba(6,78,59,0.15)",
          },
        },
        "rating-card-hard": {
          "0%": {
            boxShadow: "0 20px 60px -32px rgba(6,78,59,0.45)",
            borderColor: "rgba(6,78,59,0.15)",
          },
          "45%": {
            boxShadow: "0 26px 72px -28px rgba(180,83,9,0.34)",
            borderColor: "rgba(180,83,9,0.42)",
          },
          "100%": {
            boxShadow: "0 20px 60px -32px rgba(6,78,59,0.45)",
            borderColor: "rgba(6,78,59,0.15)",
          },
        },
        "rating-card-good": {
          "0%": {
            boxShadow: "0 20px 60px -32px rgba(6,78,59,0.45)",
            borderColor: "rgba(6,78,59,0.15)",
          },
          "45%": {
            boxShadow: "0 26px 72px -28px rgba(4,120,87,0.34)",
            borderColor: "rgba(4,120,87,0.42)",
          },
          "100%": {
            boxShadow: "0 20px 60px -32px rgba(6,78,59,0.45)",
            borderColor: "rgba(6,78,59,0.15)",
          },
        },
        "rating-card-easy": {
          "0%": {
            boxShadow: "0 20px 60px -32px rgba(6,78,59,0.45)",
            borderColor: "rgba(6,78,59,0.15)",
          },
          "45%": {
            boxShadow: "0 26px 72px -28px rgba(13,148,136,0.34)",
            borderColor: "rgba(13,148,136,0.42)",
          },
          "100%": {
            boxShadow: "0 20px 60px -32px rgba(6,78,59,0.45)",
            borderColor: "rgba(6,78,59,0.15)",
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
