import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2C3E50',
        secondary: '#D35400',
      },
      borderRadius: {
        custom: '4px',
      },
    },
  },
  
  plugins: [],
}
export default config
