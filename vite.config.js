import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config: tells the build tool to understand React (JSX) files.
export default defineConfig({
  plugins: [react()],
})
