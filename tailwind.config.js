/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './client/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Custom Colors
      colors: {
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        teal: {
          500: '#14b8a6',
          600: '#0d9488',
        },
      },
      // Custom Shadows
      boxShadow: {
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      },
      // Custom Animations
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-in-out forwards',
        'slide-in-left': 'slideInLeft 0.5s ease-in-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-in-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      // Custom Font Family
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      // Custom Transitions
      transitionProperty: {
        height: 'height',
        spacing: 'margin, padding',
        transform: 'transform',
        'shadow-transform': 'box-shadow, transform',
      },
      // Custom Spacing
      spacing: {
        18: '4.5rem',
        112: '28rem',
        128: '32rem',
      },
      // Custom Border Radius
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      // Custom Opacity
      opacity: {
        15: '0.15',
        85: '0.85',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    // Custom plugin for animation delay
    ({ addUtilities }) => {
      const animationDelays = {
        '.animation-delay-100': {
          'animation-delay': '0.1s',
        },
        '.animation-delay-200': {
          'animation-delay': '0.2s',
        },
        '.animation-delay-300': {
          'animation-delay': '0.3s',
        },
      };
      addUtilities(animationDelays);
    },
  ],
  // Improve performance in production
  future: {
    purgeLayersByDefault: true,
    removeDeprecatedGapUtilities: true,
  },
  // Enable dark mode
  darkMode: 'class',
};