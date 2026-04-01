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
          bg:      '#080808',
          surface: '#0f0f0f',
          surface2:'#141414',
          border:  '#1c1c1c',
          muted:   '#242424',
          text:    '#f2f2f2',
          sub:     '#777777',
          red:     '#ff3b30',
          yellow:  '#ffd60a',
          green:   '#30d158',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
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
