import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#eef7f2',
          100: '#d4eddf',
          200: '#a8dbbf',
          300: '#6cc59a',
          400: '#3aab78',
          500: '#2d8a5f',
          600: '#2D6A4F',
          700: '#1e5038',
          800: '#143626',
          900: '#0a1c14',
        },
        terra: {
          50:  '#fdf3ee',
          100: '#fae4d5',
          200: '#f4c9ab',
          300: '#ecab81',
          400: '#e28a57',
          500: '#C4724A',
          600: '#a85838',
          700: '#8a4228',
          800: '#6d2e1b',
          900: '#4f1c0d',
        },
        warm: {
          50:  '#FAFAF8',
          100: '#F5F4F0',
          200: '#E8E5DE',
          300: '#D4CFC5',
          400: '#B8B1A5',
          500: '#9B9286',
          600: '#7D7569',
          700: '#5C554B',
          800: '#3D3831',
          900: '#1C1917',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans:  ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft:   '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
        medium: '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
        strong: '0 4px 16px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
export default config
