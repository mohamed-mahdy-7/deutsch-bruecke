import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        xs: "390px",
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        "card-foreground": "hsl(var(--card-foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          soft: "hsl(var(--primary-soft) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          soft: "hsl(var(--accent-soft) / <alpha-value>)",
          "soft-foreground":
            "hsl(var(--accent-soft-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          foreground: "hsl(var(--danger-foreground) / <alpha-value>)",
        },
        masc: "hsl(var(--masc) / <alpha-value>)",
        fem: "hsl(var(--fem) / <alpha-value>)",
        neut: "hsl(var(--neut) / <alpha-value>)",
        verb: "hsl(var(--verb) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Cairo Variable",
          "Tajawal",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        arabic: [
          "Cairo Variable",
          "Tajawal",
          "Segoe UI",
          "Tahoma",
          "sans-serif",
        ],
        latin: ["Inter Variable", "Segoe UI", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 12px 40px -18px hsl(var(--foreground) / 0.22)",
        lift: "0 18px 55px -22px hsl(var(--foreground) / 0.3)",
        innerSoft: "inset 0 1px 0 hsl(0 0% 100% / 0.15)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "70%": { transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-2deg)" },
          "75%": { transform: "rotate(2deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.3s ease-out both",
        pop: "pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-soft": "pulse-soft 2.2s ease-in-out infinite",
        wiggle: "wiggle 0.35s ease-in-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
