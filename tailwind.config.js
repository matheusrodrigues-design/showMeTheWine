/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bordoux: {
          DEFAULT: '#4A0E17',
          deep: '#2E0A10',
          soft: '#6B1A28',
        },
        gold: {
          DEFAULT: '#D4AF37',
          muted: '#B8962E',
          soft: '#E8D48B',
        },
        amolde: {
          DEFAULT: '#121212',
          elevated: '#1A1A1A',
          surface: '#1E1E1E',
          border: '#2A2A2A',
        },
        cream: '#F5F0E8',
      },
      fontFamily: {
        display: ['CormorantGaramond_600SemiBold'],
        displayItalic: ['CormorantGaramond_500Medium_Italic'],
        body: ['DMSans_400Regular'],
        bodyMedium: ['DMSans_500Medium'],
      },
    },
  },
  plugins: [],
};
