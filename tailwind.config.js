/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        page: '#F5F3EF',
        card: '#FEFDFB',
        surface: '#FAF8F5',
        'deep-teal': {
          900: '#0D554A',
          800: '#0A3F37',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
    },
  },
  plugins: [],
};
