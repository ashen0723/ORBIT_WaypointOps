export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        forest: '#0F4D2E',
        brand: {
          DEFAULT: '#1B6B3F',
          medium: '#2A8A50',
          mint: '#5FBF8A',
          pale: '#E3F1E8',
        },
        canvas: '#EEF0EE',
        surface: '#FFFFFF',
        ink: '#111111',
        subtle: '#5C615E',
        muted: '#8A8F8C',
        hatch: '#B5BAB6',
        line: '#E0E3E0',
        danger: { DEFAULT: '#E5484D', ink: '#B3282D', pale: '#FDECEC' },
        amber: { DEFAULT: '#F2A93B', ink: '#7A4E0A', pale: '#FDF3E2' },
        blue: { DEFAULT: '#3B5BDB', ink: '#2B45A8' },
        teal: { DEFAULT: '#2B8C8C', ink: '#1D6363' },
        purple: { DEFAULT: '#7B4FBF', ink: '#5E3A96' },
      },
      borderRadius: {
        card: '20px',
        panel: '28px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        pop: '0 8px 24px rgba(0,0,0,0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};
