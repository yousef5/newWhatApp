import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'electron/main.ts'),
        output: {
          entryFileNames: 'index.js'
        }
      }
    },
    resolve: {
      alias: { '@shared': resolve(__dirname, 'shared') }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'electron/preload.ts'),
        output: {
          entryFileNames: 'index.js'
        }
      }
    },
    resolve: {
      alias: { '@shared': resolve(__dirname, 'shared') }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/index.html')
      }
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer(),
        ]
      }
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'shared'),
        '@': resolve(__dirname, 'src')
      }
    },
    plugins: [react()]
  }
})
