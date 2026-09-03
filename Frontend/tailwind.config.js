/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#07070a',
          900: '#0c0c10',
          850: '#101016',
          800: '#14141c',
          700: '#1e1e2a',
          600: '#2d2d3e',
        },
        obsidian: '#090a0f',
        mafia: {
          red: '#EF4444',
          crimson: '#DC2626',
          dark: '#991B1B',
          glow: '#FCA5A5'
        },
        dev: {
          blue: '#3B82F6',
          cyan: '#06B6D4',
          emerald: '#10B981',
          purple: '#8B5CF6'
        },
        violet: {
          glow: '#8b5cf6',
          neon: '#7c3aed',
          dark: '#4c1d95',
          soft: '#a78bfa',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
        sans: ['Inter', 'Roboto', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-red': 'glowRed 2s infinite alternate',
        'glow-purple': 'glowPurple 2s infinite alternate',
        'glow-blue': 'glowBlue 2s infinite alternate',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        glowRed: {
          '0%': { boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)' },
          '100%': { boxShadow: '0 0 25px rgba(239, 68, 68, 0.8)' }
        },
        glowPurple: {
          '0%': { boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)' },
          '100%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.8)' }
        },
        glowBlue: {
          '0%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)' },
          '100%': { boxShadow: '0 0 25px rgba(59, 130, 246, 0.8)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        }
      }
    },
  },
  plugins: [],
}
