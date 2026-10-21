import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://jah-guide.github.io/mystic-ndt/
// Override with VITE_BASE_PATH in CI; keep `/` for local `npm run dev`.
const base = process.env.VITE_BASE_PATH || '/';

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
});
