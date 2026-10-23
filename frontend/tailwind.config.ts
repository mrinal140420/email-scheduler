import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        figma: {
          green: '#00A343',
          greenLight: '#EAF7EE',
          greenHover: '#008F3A',
          grayBg: '#F4F6F5',
          orangeBg: '#FFF3E6',
          orangeText: '#D97706',
          border: '#E5E7EB',
        },
      },
    },
  },
  plugins: [],
};
export default config;
