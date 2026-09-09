// Read-only deployment smoke check. Never logs keys, URLs, or player records.
import { Buffer } from 'node:buffer';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
if (!url || !key)
  throw new Error(
    'Set the Supabase project URL and publishable key in .env first.',
  );
let keyRole = key.startsWith('sb_publishable_') ? 'anon' : null;
try {
  if (key.split('.').length === 3)
    keyRole = JSON.parse(
      Buffer.from(key.split('.')[1], 'base64url').toString(),
    ).role;
} catch {}
if (keyRole !== 'anon')
  throw new Error('Use a publishable/anon key. Never bundle an elevated key.');
const headers = { apikey: key, 'Content-Type': 'application/json' };
async function request(path, body) {
  const response = await fetch(`${url.replace(/\/$/, '')}${path}`, {
    method: body ? 'POST' : 'GET',
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json();
  return { response, data };
}
try {
  const ranking = await request('/rest/v1/rpc/leaderboard', { p_limit: 1 });
  if (!ranking.response.ok)
    throw new Error(
      ranking.data.code === 'PGRST202'
        ? 'Project is reachable, but ranking migrations are missing. Apply both supabase/migrations files in order.'
        : `Ranking API failed (HTTP ${ranking.response.status}). Check the key, schema, and project status.`,
    );
  if (!Array.isArray(ranking.data))
    throw new Error('Unexpected ranking response. Check the deployed schema.');
  const [profiles, admin] = await Promise.all([
    request('/rest/v1/profiles?select=id&limit=1'),
    request('/rest/v1/rpc/admin_overview', {}),
  ]);
  for (const [name, result] of [
    ['private profiles', profiles],
    ['admin operations', admin],
  ]) {
    if (![401, 403].includes(result.response.status))
      throw new Error(
        `Anonymous access boundary failed for ${name}. Review grants before release.`,
      );
  }
  console.log(
    'Live backend checks passed: rankings respond; anonymous profile reads and admin calls are denied. Email delivery and authenticated device flows still require staging verification.',
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'Could not connect to the backend.',
  );
  process.exitCode = 1;
}
