/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'neu-sm':  '4px 4px 8px #d1d5db, -4px -4px 8px #ffffff',
        'neu':     '6px 6px 12px #d1d5db, -6px -6px 12px #ffffff',
        'neu-lg':  '10px 10px 20px #d1d5db, -10px -10px 20px #ffffff',
        'neu-inset': 'inset 4px 4px 8px #d1d5db, inset -4px -4px 8px #ffffff',
        'neu-dark-sm':  '4px 4px 8px #0f0a1e, -4px -4px 8px #2d1f4e',
        'neu-dark':     '6px 6px 12px #0f0a1e, -6px -6px 12px #2d1f4e',
        'neu-dark-inset': 'inset 4px 4px 8px #0f0a1e, inset -4px -4px 8px #2d1f4e',
        'glow':    '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(139, 92, 246, 0.4)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
        'gradient-soft':  'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
        'gradient-dark':  'linear-gradient(135deg, #1e1033 0%, #0f0a1e 100%)',
      },
      borderRadius: {
        'xl':  '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
