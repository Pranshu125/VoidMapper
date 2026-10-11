/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#050505',
          pure: '#000000',
          surface: '#0a0a0a',
          panel: '#111111',
          border: '#1f1f1f',
          muted: '#525252',
          metallic: '#8a8a8a',
          silver: '#c4c4c4',
          crisp: '#f5f5f5',
          white: '#ffffff',
        },
      },
      fontFamily: {
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"SFMono-Regular"',
          'Consolas',
          '"Liberation Mono"',
          'Menlo',
          'monospace',
        ],
        sans: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      letterSpacing: {
        widest: '0.22em',
        ultra: '0.35em',
      },
      boxShadow: {
        aura: '0 0 40px -10px rgba(255, 255, 255, 0.14)',
        'aura-strong': '0 0 60px -5px rgba(255, 255, 255, 0.28)',
      },
    },
  },
  plugins: [],
};
