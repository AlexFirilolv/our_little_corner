/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Twofold color palette
        primary: {
          DEFAULT: "#ee2b6c", // New Design Primary
          foreground: "#FDF6F7", // Blush Paper (light text on dark primary)
        },
        "background-light": "#f8f6f6",
        "background-dark": "#221016",
        "input-dark": "#331922",
        "border-dark": "#673244",
        secondary: {
          DEFAULT: "#FDF6F7", // Blush Paper
          foreground: "#4A2C35", // Dark Truffle
        },
        accent: {
          DEFAULT: "#C8A659", // Muted Gold
          foreground: "#4A2C35", // Dark Truffle
        },
        background: "#FDF6F7", // Blush Paper
        foreground: "#4A2C35", // Dark Truffle
        border: "#BA4A68", // Deep Rose
        input: "#FDF6F7", // Blush Paper
        ring: "#BA4A68", // Deep Rose
        muted: {
          DEFAULT: "#F5EEF0", // Slightly darker blush
          foreground: "#5C5470", // Truffle (original)
        },
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)",
          foreground: "hsl(210 40% 98%)",
        },
        gold: "#C8A659", // Muted Gold accent
        rose: "#BA4A68", // Deep Rose
        truffle: "#4A2C35", // Dark Truffle
        blush: "#FDF6F7", // Blush Paper
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        'heading': ['var(--font-heading)', '"Playfair Display"', 'serif'],
        'body': ['var(--font-body)', '"Lato"', 'sans-serif'],
        'display': ['var(--font-jakarta)', '"Plus Jakarta Sans"', 'sans-serif'],
        'newsreader': ['var(--font-newsreader)', '"Newsreader"', 'serif'],
        'sans': ['var(--font-noto)', '"Noto Sans"', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "heart-beat": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
        },
        "bounce-right": {
          "0%, 100%": {
            transform: "translateX(0)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)"
          },
          "50%": {
            transform: "translateX(25%)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)"
          }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "heart-beat": "heart-beat 1.5s ease-in-out infinite",
        "bounce-right": "bounce-right 1s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}