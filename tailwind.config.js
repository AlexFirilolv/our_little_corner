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
        // Romantic color palette from design.md
        primary: {
          DEFAULT: "#FFC0CB", // Pastel Pink
          foreground: "#5C5470", // Dark Muted Purple
        },
        secondary: {
          DEFAULT: "#F5E6E8", // Creamy White
          foreground: "#5C5470",
        },
        accent: {
          DEFAULT: "#D9AAB7", // Dusty Rose
          foreground: "#5C5470",
        },
        background: "#F5E6E8",
        foreground: "#5C5470",
        border: "#D9AAB7",
        input: "#F5E6E8",
        ring: "#FFC0CB",
        muted: {
          DEFAULT: "#F5E6E8",
          foreground: "#5C5470",
        },
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)",
          foreground: "hsl(210 40% 98%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        'romantic': ['var(--font-romantic)', '"Dancing Script"', 'cursive'],
        'body': ['var(--font-body)', '"Quicksand"', 'sans-serif'],
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "heart-beat": "heart-beat 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}