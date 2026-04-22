/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'drac-bg-primary': 'var(--bg-primary)',
        'drac-bg-secondary': 'var(--bg-secondary)',
        'drac-bg-tertiary': 'var(--bg-tertiary)',
        'drac-accent': 'var(--bg-accent)',
        'drac-accent-hover': 'var(--bg-accent-hover)',
        'drac-success': 'var(--success-color)',
        'drac-success-bg': 'var(--success-bg)',
        'drac-danger': 'var(--danger-color)',
        'drac-danger-bg': 'var(--danger-bg)',
        'drac-text-primary': 'var(--text-primary)',
        'drac-text-secondary': 'var(--text-secondary)',
        'drac-text-accent': 'var(--text-accent)',
        'drac-border': 'var(--border-color)',
      },
      fontFamily: {
        'outfit': ['Outfit', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
