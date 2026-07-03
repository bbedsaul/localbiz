import type { Config } from 'tailwindcss';

/**
 * Theme maps every color to a CSS variable defined in src/styles/tokens.css —
 * that file is the single source of truth. Legacy semantic names (canvas, ink,
 * brand, line) are repointed to brand tokens so pre-W1 pages (dashboard/login/
 * onboarding) adopt the LocalMarket brand without edits; W2 refines them.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette — rgb(var/<alpha-value>) so opacity modifiers work.
        green: {
          50: 'rgb(var(--green-50) / <alpha-value>)',
          100: 'rgb(var(--green-100) / <alpha-value>)',
          700: 'rgb(var(--green-700) / <alpha-value>)',
          800: 'rgb(var(--green-800) / <alpha-value>)',
          900: 'rgb(var(--green-900) / <alpha-value>)',
        },
        brick: {
          100: 'rgb(var(--brick-100) / <alpha-value>)',
          600: 'rgb(var(--brick-600) / <alpha-value>)',
          700: 'rgb(var(--brick-700) / <alpha-value>)',
        },
        paper: {
          50: 'rgb(var(--paper-50) / <alpha-value>)',
          100: 'rgb(var(--paper-100) / <alpha-value>)',
          200: 'rgb(var(--paper-200) / <alpha-value>)',
        },
        charcoal: {
          500: 'rgb(var(--charcoal-500) / <alpha-value>)',
          700: 'rgb(var(--charcoal-700) / <alpha-value>)',
          900: 'rgb(var(--charcoal-900) / <alpha-value>)',
        },
        peach: {
          300: 'rgb(var(--peach-300) / <alpha-value>)',
        },
        grade: {
          a: 'rgb(var(--grade-a) / <alpha-value>)',
          b: 'rgb(var(--grade-b) / <alpha-value>)',
          c: 'rgb(var(--grade-c) / <alpha-value>)',
          d: 'rgb(var(--grade-d) / <alpha-value>)',
          f: 'rgb(var(--grade-f) / <alpha-value>)',
        },

        // Legacy semantic aliases → repointed to brand tokens (back-compat)
        canvas: 'rgb(var(--paper-50) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--charcoal-900) / <alpha-value>)',
          soft: 'rgb(var(--charcoal-700) / <alpha-value>)',
          faint: 'rgb(var(--charcoal-500) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        brand: {
          50: 'rgb(var(--green-50) / <alpha-value>)',
          100: 'rgb(var(--green-100) / <alpha-value>)',
          500: 'rgb(var(--green-900) / <alpha-value>)',
          600: 'rgb(var(--green-800) / <alpha-value>)',
          700: 'rgb(var(--green-700) / <alpha-value>)',
        },
      },
      fontFamily: {
        // Wired to next/font CSS variables in app/layout.tsx
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        sign: 'var(--shadow-sign)',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-lg)',
        '2xl': 'var(--radius-xl)',
      },
      maxWidth: {
        prose: '38rem',
      },
      keyframes: {
        // Hero signboard settles from a tilt to rest, pivoting at the bracket.
        'sign-settle': {
          '0%': { transform: 'rotate(-7deg)' },
          '55%': { transform: 'rotate(3.5deg)' },
          '80%': { transform: 'rotate(-1.5deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        // Gentle idle sway once at rest.
        'sign-sway': {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
      },
      animation: {
        'sign-settle': 'sign-settle 1.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'sign-sway': 'sign-sway 6s ease-in-out 1.6s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
