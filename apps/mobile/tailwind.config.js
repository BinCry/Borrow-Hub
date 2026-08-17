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
          pressed: '#2A463B',
        },
        background: '#F7F8F5',
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F3F4F6',
          elevated: '#FFFFFF',
        },
        text: {
          primary: '#1F2937',
          secondary: '#4B5563',
          muted: '#9CA3AF',
          inverse: '#FFFFFF',
        },
        border: '#E5E7EB',
        divider: '#F3F4F6',
        success: '#2F855A',
        warning: '#D97706',
        danger: '#DC5C5C',
        info: '#3B82F6',
      }
    },
  },
  plugins: [],
}
