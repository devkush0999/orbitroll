import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../../src/lib/database.types';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
export const client =
  url && key
    ? createClient<Database>(url, key, {
        auth: {
          storageKey: 'orbit-roll-admin-auth',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
export function backend() {
  if (!client)
    throw new Error(
      'Configure the admin Supabase environment before signing in.',
    );
  return client;
}
export async function result<T>(
  query: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<NonNullable<T>> {
  const response = await query;
  if (response.error) throw new Error(response.error.message);
  return response.data as NonNullable<T>;
}
