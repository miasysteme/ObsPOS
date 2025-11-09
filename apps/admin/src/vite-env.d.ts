/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_WAVE_API_KEY: string
  readonly VITE_WAVE_SECRET: string
  readonly VITE_ADMIN_URL: string
  readonly VITE_CLIENT_URL: string
  readonly VITE_SUBSCRIPTION_PRICE: string
  readonly VITE_GRACE_PERIOD_DAYS: string
  readonly VITE_LIMITED_SALES_PER_DAY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
