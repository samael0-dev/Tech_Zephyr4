/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        citrix: {
          bg: '#F7F8F6',
          white: '#FFFFFF',
          text: '#101110',
          secondary: '#777D78',
          border: '#E5E8E3',
          dark: '#080A09',
          darkSurface: '#121614',
          darkCard: '#161B18',
          darkBorder: '#1F2420',
          darkMuted: '#9AA19C',
          accent: '#B8F36B',
          accentHover: '#A6E854',
          accentDark: '#7FB33C',
          navy: '#0B132B',
          navyDark: '#070D1F',
          teal: '#007A64',
          emerald: '#10B981',
        },
        navy: {
          950: '#050706',
          900: '#080A09',
          800: '#121614',
          700: '#161B18',
          600: '#1F2420',
          500: '#777D78',
          400: '#9AA19C',
        },
        brand: {
          blue: '#B8F36B',
          teal: '#007A64',
          indigo: '#10B981',
          accent: '#B8F36B',
        },
        status: {
          available: '#B8F36B',
          occupied: '#EF4444',
          partial: '#F59E0B',
          pending: '#10B981',
        },
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)',
        premium: '0 20px 40px -15px rgba(0,0,0,0.06), 0 0 1px 1px rgba(0,0,0,0.04)',
        elevation: '0 30px 60px -15px rgba(0,0,0,0.12), 0 16px 32px -10px rgba(0,0,0,0.08)',
        floating: '0 35px 80px -20px rgba(0,0,0,0.2), 0 20px 40px -15px rgba(0,0,0,0.12)',
        'glow-green': '0 0 35px -5px rgba(184, 243, 107, 0.45)',
        'glow-sm': '0 0 15px -2px rgba(184, 243, 107, 0.5)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, #080A09 0%, #161B18 50%, #080A09 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
