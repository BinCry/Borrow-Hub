/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F7C6B',
          dark: '#365B4E',
          soft: '#DDEDE6',
        },
        background: '#F7F8F5',
        surface: '#FFFFFF',
        text: {
          primary: '#1F2937',
          secondary: '#6B7280',
        },
        border: '#E5E7EB',
        success: '#2F855A',
        warning: '#D97706',
        danger: '#DC5C5C',
      }
    },
  },
  plugins: [],
}
