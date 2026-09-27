/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'candy-pink':   '#FF6EB4',
        'candy-blue':   '#4FC3F7',
        'candy-green':  '#69F0AE',
        'candy-yellow': '#FFD740',
        'candy-purple': '#CE93D8',
        'candy-orange': '#FFAB40',
        // Notebook answer sheet (school games)
        'paper':        '#FFFBEF',
        'paper-edge':   '#EADFC4',
        'paper-rule':   '#D3E3F1',
        'ink':          '#1E3A5F',
        'butter':       '#FFE9A8',
      },
    },
  },
  plugins: [],
}

