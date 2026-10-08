/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './notes.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        polar: {
          50: '#F0F7FC',
          100: '#DCEBF7',
          200: '#BFDCEE',
          300: '#93C3DE',
          400: '#4FA8CC',
          500: '#1FA9C9',
          600: '#1785A5',
          700: '#164A73',
          800: '#0B2A4A',
          900: '#071C33',
        },
        beak: {
          DEFAULT: '#F97316',
          dark: '#C2410C',
          soft: '#FFF1E4',
        },
        adelie: '#3D6FB4',
        chinstrap: '#16A34A',
        gentoo: '#7FA53C',
        femalepink: '#16A34A',
        maleblue: '#2F5D8A',
        ink: '#12324F',
        mist: '#5A7590',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', '"Cascadia Code"', 'Consolas', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(18, 50, 79, 0.06)',
        'card-hover': '0 6px 20px rgba(18, 50, 79, 0.12)',
      },
    },
  },
  plugins: [],
};
