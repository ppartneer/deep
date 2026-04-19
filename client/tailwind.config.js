/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deep: '#050B14',
        surface: '#0E1A2B',
        accent: '#00F0FF',
        danger: '#FF3366',
        textPrimary: '#FFFFFF',
        textSecondary: '#B0C4DE',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
