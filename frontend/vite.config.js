import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Do tarah ki build:
 *
 *   npm run build      -> normal dist/, Express use karta hai
 *   npm run build:gas  -> ek hi HTML file, appsscript/index.html me
 *
 * Apps Script ka HtmlService alag se CSS/JS files serve nahi kar sakta,
 * isliye wahan sab kuch ek file me inline karna padta hai.
 */
export default defineConfig(({ mode }) => {
  const gas = mode === 'gas';

  return {
    plugins: [react(), tailwindcss(), ...(gas ? [viteSingleFile()] : [])],

    build: gas
      ? {
          outDir: '../appsscript',
          emptyOutDir: false,        // .gs files ko haath mat lagao
          cssCodeSplit: false,
          assetsInlineLimit: 100000000,
          rollupOptions: { output: { inlineDynamicImports: true } }
        }
      : {},

    server: {
      port: 5173,
      proxy: { '/api': 'http://localhost:4000' }
    }
  };
});
