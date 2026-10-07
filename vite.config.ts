import { defineConfig } from 'vite';

// Relative base so the build works on any sub-path (GitHub Pages, S3, itch.io…).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4500,
  },
  server: { host: true },
});
