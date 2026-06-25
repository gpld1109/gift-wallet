import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "giftwallet-auth",
    storage: {
      getItem: (key) => {
        try { return localStorage.getItem(key); } catch { return null; }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
          // Also store in sessionStorage as fallback for PWA
          sessionStorage.setItem(key, value);
        } catch {}
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch {}
      },
    },
  }
});
