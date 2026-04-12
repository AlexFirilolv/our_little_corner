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
        // ── Pressed Botanica Design System ──
        background: "var(--background)",
        elevated: "var(--elevated)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        border: "var(--border)",
        "border-emphasis": "var(--border-emphasis)",
        input: "var(--elevated)",
        ring: "var(--primary)",
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        // Semantic surfaces
        "surface-rose": "var(--surface-rose)",
        "surface-green": "var(--surface-green)",
        "surface-amber": "var(--surface-amber)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // New design system
        'display': ['var(--font-display)', '"Fraunces"', 'serif'],
        'body': ['var(--font-body)', '"DM Sans"', 'sans-serif'],
        'serif': ['var(--font-serif)', '"Newsreader"', 'serif'],
        'sans': ['var(--font-body)', '"DM Sans"', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['2.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'heading': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'subheading': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.6875rem', { lineHeight: '1.4', fontWeight: '500' }],
        'overline': ['0.625rem', { lineHeight: '1.2', fontWeight: '600' }],
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
          from: { opacity: 0, transform: "translateY(12px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: 0, transform: "translateY(16px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "slide-in-bottom": {
          from: { opacity: 0, transform: "translateY(100%)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: 0, transform: "scale(0.95)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        "like-pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
        // Legacy (kept during migration)
        "heart-beat": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
        },
        "bounce-right": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(25%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.35s ease-out",
        "slide-in-bottom": "slide-in-bottom 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "like-pop": "like-pop 0.3s ease-out",
        // Legacy
        "heart-beat": "heart-beat 1.5s ease-in-out infinite",
        "bounce-right": "bounce-right 1s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
