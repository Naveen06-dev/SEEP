/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        surface: '#ffffff',
        border: '#e2e8f0',
        primary: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
        },
        secondary: {
          DEFAULT: '#2563eb',
        },
        success: {
          DEFAULT: '#10b981',
          bg: '#ecfdf5',
        },
        error: {
          DEFAULT: '#f43f5e',
          bg: '#fff1f2',
        },
        warning: {
          DEFAULT: '#f59e0b',
          bg: '#fffbeb',
        },
        info: {
          DEFAULT: '#3b82f6',
        },
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)',
      },
      borderRadius: {
        'xl': '12px',
        'lg': '8px',
      }
    },
  },
  plugins: [],
}
