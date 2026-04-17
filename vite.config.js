import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // Facebook Instant Games serves files from a package path,
  // so assets must be referenced relatively, not from "/".
  base: './',
  plugins: [vue()],
})
