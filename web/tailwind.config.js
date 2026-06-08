/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Match Flutter AppPalette — bound to CSS vars so dark/light + per-community
        // brand override flip in one place.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface-2) / <alpha-value>)',
        ink: 'rgb(var(--on-bg) / <alpha-value>)',
        ink2: 'rgb(var(--on-bg-2) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        border2: 'rgb(var(--border-2) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          ink: 'rgb(var(--brand-ink) / <alpha-value>)',
          wash: 'rgb(var(--brand-wash) / <alpha-value>)',
          on: 'rgb(var(--on-brand) / <alpha-value>)',
        },
        ok: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          wash: 'rgb(var(--success-wash) / <alpha-value>)',
        },
        warn: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          wash: 'rgb(var(--warning-wash) / <alpha-value>)',
        },
        bad: {
          DEFAULT: 'rgb(var(--error) / <alpha-value>)',
          wash: 'rgb(var(--error-wash) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px',
        xl: '28px',
      },
      boxShadow: {
        low: '0 1px 2px rgb(20 19 15 / 0.05), 0 1px 3px rgb(20 19 15 / 0.04)',
        mid: '0 4px 10px rgb(20 19 15 / 0.07), 0 2px 4px rgb(20 19 15 / 0.05)',
        high: '0 16px 40px rgb(20 19 15 / 0.16), 0 4px 12px rgb(20 19 15 / 0.08)',
      },
    },
  },
  plugins: [],
};
