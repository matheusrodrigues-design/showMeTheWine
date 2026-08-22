import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/core/config/env';
import { secureStorage } from '@/core/security/secureStorage';

let client: SupabaseClient | null = null;

/**
 * Cliente Supabase com sessão em SecureStore (nunca AsyncStorage para tokens).
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}
