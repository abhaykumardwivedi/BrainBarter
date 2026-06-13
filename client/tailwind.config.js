/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Vivid violet brand (PrimeCraft-style) — bright on black
        brand: {
          50:  '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d6b4fe',
          400: '#c77dff',
          500: '#b15eff',
          600: '#9d4edd',
          700: '#8030c4',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        // Exam Mode accent — dark + red (TEDx-style)
        exam: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
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
        'glow':      '0 0 20px rgba(157, 78, 221, 0.35)',
        'glow-lg':   '0 0 40px rgba(157, 78, 221, 0.45)',
        'glow-exam': '0 0 28px rgba(255, 32, 32, 0.55)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #c77dff 0%, #7b2cbf 100%)',
        'gradient-soft':  'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
        'gradient-dark':  'linear-gradient(135deg, #1e1033 0%, #0f0a1e 100%)',
        'gradient-exam':  'linear-gradient(135deg, #ff2020 0%, #8b0000 100%)',
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
