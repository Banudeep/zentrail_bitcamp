/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark': {
          primary: '#001F3F',
          secondary: '#3A6D8C',
          tertiary: '#6A9AB0',
          accent: '#EAD8B1',
        },
        'light': {
          primary: '#FAF6E3',
          secondary: '#D8DBBD',
          tertiary: '#B59F78',
          accent: '#2A3663',
        },
      },
      fontFamily: {
        'sans': ['Poppins', 'ui-sans-serif', 'system-ui'],
        'display': ['Playfair Display', 'ui-serif', 'Georgia'],
        'cinzel': ['Cinzel', 'serif'],
        'cormorant': ['Cormorant Garamond', 'serif'],
        'tenor': ['Tenor Sans', 'sans-serif']
      },
    },
  },
  plugins: [],
} 