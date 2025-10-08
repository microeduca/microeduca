import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: true,
    minify: 'terser',
    target: 'es2018',
    terserOptions: {
      compress: {
        ecma: 2020,
        inline: 0,
        reduce_vars: false,
      },
      mangle: true,
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
