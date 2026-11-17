import { defineConfig } from 'vite';

// three.js and gsap change rarely: ship them as their own long-cached chunks
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'], gsap: ['gsap'] },
      },
    },
  },
});
