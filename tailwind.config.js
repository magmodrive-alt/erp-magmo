/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea6c0a',
          700: '#c2570c',
        },
        dark: {
          800: '#1a2540',
          900: '#0f1729',
        }
      }
    },
  },
  plugins: [],
}
