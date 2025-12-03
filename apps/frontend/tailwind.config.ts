import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  // Use important to ensure Tailwind utilities override Ant Design reset
  important: true,
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config

