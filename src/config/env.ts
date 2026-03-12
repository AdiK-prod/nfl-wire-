const configs = {
  development: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    apiUrl: 'http://localhost:54321/functions/v1',
    appUrl: 'http://localhost:5173',
    enableDebugLogs: true,
  },
  staging: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    apiUrl: 'https://[staging-project].supabase.co/functions/v1',
    appUrl: 'https://staging.nflwire.com',
    enableDebugLogs: true,
  },
  production: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    apiUrl: 'https://[prod-project].supabase.co/functions/v1',
    appUrl: 'https://nflwire.com',
    enableDebugLogs: false,
  },
} as const;

type EnvKey = keyof typeof configs;

const env = (import.meta.env.MODE as EnvKey) || 'development';

export const envConfig = configs[env] ?? configs.development;

