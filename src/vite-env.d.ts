/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REACT_APP_SUPABASE_URL: string
  readonly VITE_REACT_APP_SUPABASE_ANON_KEY: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
