/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'film-black': '#0a0a0a',
        'film-dark': '#111111',
        'film-gray': '#1a1a1a',
        'film-gold': '#c9a84c',
        'film-red': '#e63946',
        'film-light': '#f0ede8',
      },
      fontFamily: {
        sans: ['Noto Sans TC', 'sans-serif'],
        display: ['Noto Serif TC', 'serif'],
      },
    },
  },
  plugins: [],
};
