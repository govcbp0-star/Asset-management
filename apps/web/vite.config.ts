import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // The repository uses one root .env.local shared by the web and trusted tooling.
  envDir: '../..',
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase-vendor', test: /node_modules[\\/]@firebase[\\/]/, priority: 20 },
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router|scheduler)([\\/]|$)/, priority: 15 },
          ],
        },
      },
    },
  },
})
