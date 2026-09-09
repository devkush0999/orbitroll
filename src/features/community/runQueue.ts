import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { requireSupabase } from '@/lib/supabase';
import type { Direction } from '../game/types';
import { parseQueue, type PendingRun } from './validation';
export const LEVEL_REVISION = 1;
const key = (user: string) => `orbit-roll:ranked:${user}:v1`;
let writes = Promise.resolve();
function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const task = writes.then(operation);
  writes = task.then(() => {}, () => {});
  return task;
}
export async function getPendingRuns(user: string) {
  return parseQueue(await AsyncStorage.getItem(key(user)));
}
export function queueRun(user: string, level: number, directions: Direction[]) {
  return exclusive(async () => {
    const pending = await getPendingRuns(user);
    if (pending.length >= 50) throw new Error('Your upload queue is full. Open your pilot profile to sync runs.');
    if (directions.length > 512) throw new Error('This run exceeded the 512-move ranking limit. Your local result is saved.');
    const run: PendingRun = { id: randomUUID(), level, revision: LEVEL_REVISION, directions: [...directions] };
    await AsyncStorage.setItem(key(user), JSON.stringify([...pending, run]));
    return run.id;
  });
}
export function flushRuns(user: string): Promise<{ uploaded: number; pending: number; error: string | null }> {
  return exclusive(async () => {
    const client = requireSupabase();
    let pending = await getPendingRuns(user);
    let uploaded = 0;
    for (const run of [...pending]) {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user.id !== user) return { uploaded, pending: pending.length, error: 'Sign in to the same account to sync these runs.' };
      const { error } = await client.rpc('submit_run', { p_id: run.id, p_level: run.level, p_revision: run.revision, p_directions: run.directions });
      if (error) return { uploaded, pending: pending.length, error: error.code === 'P0001' ? error.message : 'Could not upload right now. Your run is saved for retry.' };
      pending = pending.filter(item => item.id !== run.id);
      await AsyncStorage.setItem(key(user), JSON.stringify(pending));
      uploaded++;
    }
    return { uploaded, pending: pending.length, error: null };
  });
}
export function discardRun(user: string, id: string) {
  return exclusive(async () => {
    const pending = await getPendingRuns(user);
    await AsyncStorage.setItem(key(user), JSON.stringify(pending.filter(run => run.id !== id)));
  });
}
