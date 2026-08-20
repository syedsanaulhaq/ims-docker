import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  base: '/',
  define: {
    // Properly set NODE_ENV for the application
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    // Make VITE_API_URL available
    'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || ''),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: false,
    watch: {
      // Reduce file watching overhead
      usePolling: false,
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**']
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force resolution for problematic packages
    dedupe: ['react', 'react-dom', 'lucide-react']
  },
  optimizeDeps: {
    // Pre-bundle heavy dependencies
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@supabase/supabase-js',
      'lucide-react'
    ],
    // Exclude problematic packages from optimization
    exclude: ['@lovable/gpt-tokenizer']
  },
  build: {
    // Improve build performance
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          icons: ['lucide-react']
        }
      }
    }
  },
  esbuild: {
    // Fix JSX runtime for production builds
    jsx: 'automatic',
    jsxImportSource: 'react',
    jsxDev: false, // Ensure production JSX runtime
  }
  };
});
