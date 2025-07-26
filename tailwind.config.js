/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        departments: {
          ati: '#ef4444',      // red-500
          urgente: '#3b82f6',  // blue-500  
          chirurgie: '#10b981', // emerald-500
          interna: '#f59e0b',  // amber-500
        }
      }
    },
  },
  plugins: [],
}