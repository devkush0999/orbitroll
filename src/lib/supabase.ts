import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { authStorage } from './authStorage';
import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
export const supabase = url && key ? createClient<Database>(url, key, {
  auth: { storage: authStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, lock: processLock },
}) : null;
export function requireSupabase() {
  if (!supabase) throw new Error('Online play is not configured yet. You can still explore every trail offline.');
  return supabase;
}
