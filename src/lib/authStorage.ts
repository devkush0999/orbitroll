import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';

type Manifest = { version: string; count: number };
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
async function manifest(key: string): Promise<Manifest | null> {
  const raw = await SecureStore.getItemAsync(key, options);
  if (!raw) return null;
  const value = JSON.parse(raw) as Manifest;
  if (!/^[\da-f-]{36}$/.test(value.version) || !Number.isInteger(value.count) || value.count < 1 || value.count > 128) throw new Error('Invalid session storage');
  return value;
}
async function removeChunks(key: string, value: Manifest | null) {
  if (value) await Promise.all(Array.from({ length: value.count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${value.version}.${i}`, options)));
}
// Session payloads can exceed the native keychain's per-item size. Commit the
// manifest last so an interrupted write leaves the previous session readable.
export const authStorage = {
  async getItem(key: string) {
    const value = await manifest(key);
    if (!value) return null;
    const chunks = await Promise.all(Array.from({ length: value.count }, (_, i) => SecureStore.getItemAsync(`${key}.${value.version}.${i}`, options)));
    return chunks.some(chunk => chunk === null) ? null : chunks.join('');
  },
  async setItem(key: string, data: string) {
    const previous = await manifest(key);
    const characters = Array.from(data);
    const next = { version: randomUUID(), count: Math.ceil(characters.length / 350) };
    if (next.count < 1 || next.count > 128) throw new Error('Session exceeds secure storage capacity');
    await Promise.all(Array.from({ length: next.count }, (_, i) => SecureStore.setItemAsync(`${key}.${next.version}.${i}`, characters.slice(i * 350, (i + 1) * 350).join(''), options)));
    await SecureStore.setItemAsync(key, JSON.stringify(next), options);
    await removeChunks(key, previous).catch(() => {});
  },
  async removeItem(key: string) {
    const previous = await manifest(key);
    await SecureStore.deleteItemAsync(key, options);
    await removeChunks(key, previous);
  },
};
