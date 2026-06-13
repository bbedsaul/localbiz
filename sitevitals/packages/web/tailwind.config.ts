import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm neutral surfaces — calm, not clinical white.
        canvas: '#F7F6F2',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#16242B', // primary text
          soft: '#3D4F57', // secondary text
          faint: '#6B7A81', // muted / captions
        },
        line: '#E7E4DC', // hairline borders
        // Single trustworthy accent — "healthy".
        brand: {
          50: '#E6F4F0',
          100: '#C2E5DB',
          500: '#0E7C66',
          600: '#0B6655',
          700: '#094E41',
        },
        grade: {
          a: '#2E7D32',
          b: '#558B2F',
          c: '#F9A825',
          d: '#EF6C00',
          f: '#C62828',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(22, 36, 43, 0.04), 0 4px 16px rgba(22, 36, 43, 0.05)',
        lift: '0 8px 30px rgba(22, 36, 43, 0.10)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      maxWidth: {
        prose: '38rem',
      },
    },
  },
  plugins: [],
};

export default config;
