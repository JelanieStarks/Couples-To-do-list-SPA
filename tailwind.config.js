/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms'
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Outfit"', '"Barlow"', ...defaultTheme.fontFamily.sans],
        display: ['"Orbitron"', '"Outfit"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        surface: {
          50: '#f8f5ff',
          100: '#ebe7ff',
          200: '#d6cffc',
          300: '#b4a9f5',
          400: '#7b74d9',
          500: '#4a4cb7',
          600: '#332f8f',
          700: '#221f6b',
          800: '#14154d',
          900: '#080c2f',
        },
        neon: {
          cyan: '#22d3ee',
          magenta: '#f472d0',
          blue: '#60a5fa',
          purple: '#a855f7',
          indigo: '#6366f1',
          lime: '#a3e635',
          amber: '#fbbf24',
          pink: '#ec4899',
          slate: '#94a3b8',
        },
        brand: {
          primary: '#7c3aed',
          secondary: '#0ea5e9',
          accent: '#f472d0',
          success: '#22c55e',
          warning: '#fbbf24',
          danger: '#ef4444',
        },
      },
      backgroundImage: {
        'neon-radial': 'radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.55), rgba(2, 6, 23, 0.95))',
        'neon-conic': 'conic-gradient(from 180deg at 50% 50%, rgba(14, 165, 233, 0.18), rgba(236, 72, 153, 0.35), rgba(59, 130, 246, 0.22))',
        'neon-linear': 'linear-gradient(135deg, rgba(76, 29, 149, 0.85) 0%, rgba(124, 58, 237, 0.78) 40%, rgba(14, 165, 233, 0.75) 100%)',
        'glass-stripes': 'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.08) 100%)',
      },
      boxShadow: {
        glow: '0 0 8px rgba(124,58,237,0.45), 0 0 24px rgba(59,130,246,0.35)',
        'glow-strong': '0 0 16px rgba(236,72,153,0.55), 0 0 48px rgba(56,189,248,0.45)',
        'inset-glow': 'inset 0 0 12px rgba(99,102,241,0.35)',
      },
      borderRadius: {
        glass: '1.25rem',
        card: '1rem',
      },
      dropShadow: {
        neon: ['0 0 6px rgba(124, 58, 237, 0.8)'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.75', boxShadow: '0 0 18px rgba(124,58,237,0.15)' },
          '50%': { opacity: '1', boxShadow: '0 0 28px rgba(236,72,153,0.35)' },
        },
      },
      transitionTimingFunction: {
        'swoop': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      transitionDuration: {
        350: '350ms',
      }
    },
  },
  plugins: [
    forms,
  ],
}
