/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        headline: ['"Playfair Display"', 'Georgia', 'serif'],
        ui: ['"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

