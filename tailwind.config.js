/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}', './src/index.html'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d1117',
          secondary: '#161b22',
          tertiary: '#21262d',
          sidebar: '#010409',
        },
        accent: {
          purple: '#7c3aed',
          blue: '#3b82f6',
          green: '#3fb950',
          red: '#f85149',
        },
        text: {
          primary: '#f0f6fc',
          secondary: '#8b949e',
          muted: '#484f58',
        },
        border: {
          primary: '#21262d',
          secondary: '#30363d',
        },
        bubble: {
          incoming: '#161b22',
          outgoing: '#7c3aed',
        }
      }
    }
  },
  plugins: []
}
