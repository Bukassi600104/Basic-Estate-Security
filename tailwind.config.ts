import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
          "Noto Sans",
          "Liberation Sans",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          navy: {
            DEFAULT: "#1e3a5f",
            50: "#e8edf3",
            100: "#c5d1e0",
            200: "#9fb3ca",
            300: "#7995b4",
            400: "#5c7fa3",
            500: "#3f6992",
            600: "#365d83",
            700: "#2c4d6e",
            800: "#233d59",
            900: "#162a40",
            950: "#0d1a2a",
          },
          green: {
            DEFAULT: "#4ade80",
            50: "#edfcf2",
            100: "#d3f9e0",
            200: "#aaf2c5",
            300: "#73e6a3",
            400: "#4ade80",
            500: "#1cc85c",
            600: "#10a648",
            700: "#0f833c",
            800: "#116733",
            900: "#10542c",
            950: "#032f16",
          },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "fade-in-up": "fadeInUp 0.5s ease-out forwards",
        "slide-in-bottom": "slideInBottom 0.4s ease-out forwards",
        "scale-in": "scaleIn 0.3s ease-out forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s infinite",
        "success-pop": "successPop 0.4s ease-out forwards",
        "shake-error": "shakeError 0.5s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out infinite 2s",
        "float-slow": "float 8s ease-in-out infinite",
        "typing": "typing 3.5s steps(40, end), blinkCaret 0.75s step-end infinite",
        "counter": "counter 2s ease-out forwards",
        "gradient-x": "gradientX 15s ease infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "bounce-slow": "bounce 3s infinite",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInBottom: {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        successPop: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shakeError: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-8px)" },
          "40%, 80%": { transform: "translateX(8px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        typing: {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
        blinkCaret: {
          "0%, 100%": { borderColor: "transparent" },
          "50%": { borderColor: "#4ade80" },
        },
        counter: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(74, 222, 128, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(74, 222, 128, 0.6)" },
        },
      },
      boxShadow: {
        "inner-soft": "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
        "premium": "0 4px 20px -2px rgb(0 0 0 / 0.1)",
        "premium-lg": "0 8px 30px -4px rgb(0 0 0 / 0.15)",
        "glow-green": "0 0 30px rgba(74, 222, 128, 0.4)",
        "glow-navy": "0 0 30px rgba(30, 58, 95, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
