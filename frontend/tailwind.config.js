/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        surface: {
          DEFAULT: '#0f1117',
          card:    '#161b27',
          border:  '#1e2535',
          hover:   '#1a2236',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
