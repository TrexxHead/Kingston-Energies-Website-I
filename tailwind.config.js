/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#93c93f',
        secondary: '#f7941e',
        dark: '#0d1714',
        light: '#faf9f5',
      },
    },
  },
  plugins: [],
}
