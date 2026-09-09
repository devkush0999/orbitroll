import { writeFileSync, readFileSync } from 'node:fs';
import { levels } from '../src/features/game/levels';

const file = 'supabase/migrations/202609090002_ranked_levels.sql';
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const content =
  '-- Generated from authored levels. After deployment, change levels with a NEW revision migration.\n' +
  'insert into public.ranked_levels(id,revision,name,definition) values\n' +
  levels
    .map(
      (level) =>
        `(${level.id},1,${quote(level.name)},${quote(JSON.stringify({ path: level.path, lifts: level.lifts, gems: level.gems }))}::jsonb)`,
    )
    .join(',\n') +
  ';\n';
if (process.argv.includes('--check')) {
  if (readFileSync(file, 'utf8') !== content)
    throw new Error(
      'Ranked level definitions differ from the game. Add a versioned migration and update the client revision.',
    );
} else writeFileSync(file, content);
