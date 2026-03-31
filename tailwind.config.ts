import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:      '#ffffff',
          surface: '#f9f9f9',
          surface2:'#f2f2f2',
          border:  '#e8e8e8',
          muted:   '#f4f4f4',
          text:    '#0a0a0a',
          sub:     '#6b7280',
          red:     '#ff3b30',
          yellow:  '#f59e0b',
          green:   '#16a34a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      keyframes: {
        'border-glow': {
          '0%,100%': { 'border-color': 'rgba(255,59,48,0.3)' },
          '50%':      { 'border-color': 'rgba(255,59,48,0.8)' },
        },
      },
      animation: {
        'border-glow': 'border-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
