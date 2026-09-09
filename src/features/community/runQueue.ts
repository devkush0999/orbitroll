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
  writes = task.then(
    () => {},
    () => {},
  );
  return task;
}
export async function getPendingRuns(user: string) {
  return parseQueue(await AsyncStorage.getItem(key(user)));
}
export function queueRun(user: string, level: number, directions: Direction[]) {
  return exclusive(async () => {
    const pending = await getPendingRuns(user);
    if (pending.length >= 50)
      throw new Error(
        'Your upload queue is full. Open your pilot profile to sync runs.',
      );
    if (directions.length > 512)
      throw new Error(
        'This run exceeded the 512-move ranking limit. Your local result is saved.',
      );
    const run: PendingRun = {
      id: randomUUID(),
      level,
      revision: LEVEL_REVISION,
      directions: [...directions],
    };
    await AsyncStorage.setItem(key(user), JSON.stringify([...pending, run]));
    return run.id;
  });
}
const uploads = new Map<string, Promise<SyncResult>>();
type SyncResult = { uploaded: number; pending: number; error: string | null };
export function flushRuns(user: string): Promise<SyncResult> {
  const active = uploads.get(user);
  if (active) return active;
  const task = uploadRuns(user).finally(() => uploads.delete(user));
  uploads.set(user, task);
  return task;
}
async function uploadRuns(user: string): Promise<SyncResult> {
  const client = requireSupabase();
  let uploaded = 0;
  // Network requests never hold the storage lock: new completions can be saved
  // immediately while an older run is uploading.
  while (true) {
    const pending = await exclusive(() => getPendingRuns(user));
    const run = pending[0];
    if (!run) return { uploaded, pending: 0, error: null };
    const { data: { session } } = await client.auth.getSession();
    if (session?.user.id !== user) return { uploaded, pending: pending.length, error: 'Sign in to the same account to sync these runs.' };
    const { error } = await client.rpc('submit_run', {
      p_id: run.id, p_level: run.level, p_revision: run.revision,
      p_directions: run.directions, p_owner: user,
    });
    if (error) return { uploaded, pending: pending.length, error: error.code === 'P0001' ? error.message : 'Could not upload right now. Your run is saved for retry.' };
    await discardRun(user, run.id);
    uploaded++;
  }
}
export function discardRun(user: string, id: string) {
  return exclusive(async () => {
    const pending = await getPendingRuns(user);
    await AsyncStorage.setItem(
      key(user),
      JSON.stringify(pending.filter((run) => run.id !== id)),
    );
  });
}
