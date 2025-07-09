/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // iOS-style system colors
        'system-gray': {
          1: '#8E8E93',
          2: '#636366',
          3: '#48484A',
          4: '#3A3A3C',
          5: '#2C2C2E',
          6: '#1C1C1E',
        },
        'system-blue': '#007AFF',
        'system-green': '#34C759',
        'system-red': '#FF3B30',
        'system-orange': '#FF9500',
        'system-yellow': '#FFCC00',
        'system-purple': '#AF52DE',
        'background': {
          primary: '#FFFFFF',
          secondary: '#F2F2F7',
          tertiary: '#FFFFFF',
        },
        'label': {
          primary: '#000000',
          secondary: '#3C3C43',
          tertiary: '#3C3C43',
          quaternary: '#3C3C43',
        }
      },
      fontFamily: {
        'system': ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Helvetica Neue', 'sans-serif'],
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['17px', '24px'],
        'lg': ['20px', '28px'],
        'xl': ['24px', '32px'],
        '2xl': ['28px', '36px'],
        '3xl': ['34px', '42px'],
      },
      borderRadius: {
        'ios': '10px',
        'ios-lg': '14px',
        'ios-xl': '20px',
      },
      boxShadow: {
        'ios': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'ios-lg': '0 10px 25px rgba(0, 0, 0, 0.12), 0 5px 10px rgba(0, 0, 0, 0.24)',
      },
    },
  },
  plugins: [],
}