
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // add more env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
