import { createClient } from '@supabase/supabase-js';

const directSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured = Boolean(directSupabaseUrl && supabaseAnonKey);

const browserSupabaseUrl =
  isSupabaseConfigured && typeof window !== 'undefined'
    ? `${window.location.origin}/api/supabase`
    : directSupabaseUrl;

export const supabase = isSupabaseConfigured
  ? createClient(browserSupabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;