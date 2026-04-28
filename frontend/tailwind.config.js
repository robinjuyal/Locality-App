/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf9', 100: '#ccfbef', 200: '#99f6e0',
          300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6',
          600: '#00a884', 700: '#017561', 800: '#065f46', 900: '#064e3b'
        }
      },
      animation: {
        'bounce': 'bounce 1s infinite',
      }
    }
  },
  plugins: []
}
