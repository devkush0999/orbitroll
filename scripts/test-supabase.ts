import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { levels } from '../src/features/game/levels';
import {
  directionBetween,
  getStars,
  initialGame,
  moveCube,
} from '../src/features/game/engine';

// An isolated local PostgreSQL cluster only; never reads production credentials.
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const admin = '33333333-3333-4333-8333-333333333333';
const q = (value: string) => `'${value.replaceAll("'", "''")}'`;
const runId = (level: number) =>
  `10000000-0000-4000-8000-${String(level).padStart(12, '0')}`;
const trace = (level: (typeof levels)[number]) =>
  level.path.slice(1).map((cell, i) => directionBetween(level.path[i]!, cell)!);
const args = (level: (typeof levels)[number]) =>
  `array[${trace(level).map(q).join(',')}]::text[]`;
const check = (condition: string, label: string) =>
  `do $$ begin if not (${condition}) then raise exception ${q(label)}; end if; end $$;`;
const fails = (statement: string, pattern: string) =>
  `select pg_temp.expect_failure(${q(statement)},${q(pattern)});`;
let sql = `begin;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create function pg_temp.expect_failure(statement text, pattern text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then
   if sqlerrm not like '%' || pattern || '%' then raise exception 'Unexpected error: % (wanted %)',sqlerrm,pattern; end if;
   return;
 end;
 raise exception 'Statement unexpectedly succeeded: %',statement;
end; $$;
`;
for (const file of readdirSync('supabase/migrations')
  .filter((name) => name.endsWith('.sql'))
  .sort())
  sql += readFileSync(`supabase/migrations/${file}`, 'utf8') + '\n';
sql += `insert into auth.users(id) values('${a}'),('${b}'),('${admin}');
update public.profiles set username='alpha',display_name='Alpha',invite_code='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' where id='${a}';
update public.profiles set username='bravo',display_name='Bravo',invite_code='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' where id='${b}';
insert into private.admin_users values('${admin}');
set local role authenticated;
select set_config('request.jwt.claim.sub','${a}',true);
`;
sql += check(
  `(select count(*) from public.profiles)=1`,
  'Owner profile policy failed',
);
sql += fails(
  `insert into public.runs(id,user_id,level_id,revision,directions,moves,crystals,stars,points) values(gen_random_uuid(),'${a}',1,1,array['east'],1,3,3,999999)`,
  'permission denied',
);
sql += fails(
  `update public.profiles set invite_code='hacked' where id='${a}'`,
  'permission denied',
);
sql += fails('select * from private.admin_users', 'permission denied');
sql += fails('select public.admin_overview()', 'Admin access required');
sql += fails(`select public.submit_run(gen_random_uuid(),1,1,${args(levels[0]!)},'${b}')`, 'Account changed');
sql += fails(
  `select public.admin_moderate_player('bravo',true,'fake role')`,
  'Admin access required',
);
sql += fails(
  `select public.submit_run(gen_random_uuid(),2,1,${args(levels[1]!)})`,
  'previous ranked trail',
);
sql += fails(
  `select public.submit_run(gen_random_uuid(),1,999,${args(levels[0]!)})`,
  'version is unavailable',
);
sql += fails(
  `select public.submit_run(gen_random_uuid(),1,1,array['teleport'])`,
  'Unknown move',
);
sql += fails(
  `select public.submit_run(gen_random_uuid(),1,1,array['up'])`,
  'Move leaves the trail',
);
sql += fails(
  `select public.submit_run(gen_random_uuid(),1,1,array['east'])`,
  'Move leaves the trail',
);
sql += fails(
  `select public.submit_run(gen_random_uuid(),1,1,array['north'])`,
  'Portal not reached',
);
sql += fails(
  `select public.submit_run(gen_random_uuid(),1,1,array_fill('east'::text,array[513]))`,
  'Invalid move sequence',
);
sql += fails(
  `select public.submit_run(gen_random_uuid(),1,1,array[null]::text[])`,
  'Unknown move',
);
sql += fails(
  `select public.submit_run(gen_random_uuid(),1,1,${args(levels[0]!)} || array['east'])`,
  'Moves after the portal',
);
for (const level of levels) {
  const directions = trace(level);
  const state = directions.reduce(
    (state, direction) => moveCube(state, direction, level),
    initialGame(level),
  );
  assert.equal(state.status, 'won', `Client path ${level.id}`);
  const stars = getStars(state.moves, state.collected.length, level);
  const points =
    stars * 1000 + Math.max(0, level.path.length + 2 - state.moves) * 10;
  sql += `select public.submit_run('${runId(level.id)}',${level.id},1,${args(level)});`;
  sql += check(
    `(select points=${points} and stars=${stars} and moves=${state.moves} and crystals=${state.collected.length} from public.runs where id='${runId(level.id)}')`,
    `Replay parity trail ${level.id}`,
  );
}
sql += `select public.submit_run('${runId(1)}',1,1,${args(levels[0]!)});`;
sql += check(
  '(select count(*) from public.runs)=18',
  'Idempotent retry duplicated a run',
);
sql += fails(`select public.submit_run('${runId(1)}',null,1,${args(levels[0]!)})`, 'Retry payload changed');
sql += fails(
  `select public.submit_run('${runId(1)}',1,1,array['east'])`,
  'Retry payload changed',
);
sql += check(
  '(select count(*) from public.my_results())=18',
  'Cloud restore failed',
);
sql += `update public.profiles set display_name='Attempted takeover' where id='${b}'; reset role;`;
sql += check(
  `(select display_name='Bravo' from public.profiles where id='${b}')`,
  'Cross-account profile write',
);
sql += `set local role anon; select set_config('request.jwt.claim.sub','',true);`;
sql += check(
  '(select count(*) from public.leaderboard())=0',
  'Private player leaked on rankings',
);
sql += check(`public.player_card('alpha') is null`, 'Private card leaked');
sql += fails('select * from public.profiles', 'permission denied');
sql += fails(
  `select public.submit_run(gen_random_uuid(),1,1,array['east'])`,
  'permission denied',
);
sql += check(
  `public.invite_details('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'display_name'='Alpha'`,
  'Valid invite cannot be previewed',
);
sql += `reset role; set local role authenticated; select set_config('request.jwt.claim.sub','${a}',true); update public.profiles set is_public=true where id='${a}';`;
sql += check(
  '(select count(*) from public.leaderboard())=1',
  'Public ranking missing',
);
sql += fails(
  `select public.accept_invite('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')`,
  'own invitation',
);
sql += `select set_config('request.jwt.claim.sub','${b}',true);`;
sql += check('(select count(*) from public.runs)=0', 'Cross-account run leak');
sql += check(
  '(select count(*) from public.my_connections())=0',
  'Unexpected connection',
);
sql += fails(
  `select public.submit_run('${runId(1)}',1,1,${args(levels[0]!)})`,
  'Request ID already used',
);
sql += `select public.accept_invite('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'); select public.accept_invite('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');`;
sql += check(
  '(select count(*) from public.my_connections())=1',
  'Invite acceptance not idempotent',
);
sql += check(
  '(select count(*) from public.leaderboard(true))=1',
  'Crew ranking missing',
);
sql += `select public.disconnect_player('${a}');`;
sql += check(
  '(select count(*) from public.my_connections())=0',
  'Disconnect failed',
);
sql += `select set_config('request.jwt.claim.sub','${admin}',true); select public.admin_moderate_run('${runId(1)}',true,'Test moderation');`;
sql += check(
  `(public.player_card('alpha')->>'levels')::int=17`,
  'Hidden run still ranked',
);
sql += `select public.admin_moderate_run('${runId(1)}',false,'Restore valid run'); select public.admin_moderate_player('alpha',true,'Exclude test player');`;
sql += check(
  `public.player_card('alpha') is null`,
  'Excluded card still visible',
);
sql += check(
  '(select count(*) from public.leaderboard())=0',
  'Excluded player still ranked',
);
sql += `select set_config('request.jwt.claim.sub','${a}',true);`;
sql += fails(
  `select public.submit_run(gen_random_uuid(),1,1,${args(levels[0]!)})`,
  'unavailable for this account',
);
sql += `select set_config('request.jwt.claim.sub','${admin}',true); select public.admin_moderate_player('alpha',false,'Restore test player');`;
sql += check(
  `(public.admin_overview()->>'runs')::int=18`,
  'Admin totals incorrect',
);
sql += check(
  `jsonb_array_length(public.admin_overview()->'audit')=4`,
  'Missing audit entries',
);
sql += `rollback;`;
try {
  execFileSync(
    '/opt/homebrew/bin/psql',
    [
      '-X',
      '-q',
      '-h',
      '/tmp/orbit-roll-community-pg',
      '-p',
      '55439',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: sql, stdio: ['pipe', 'pipe', 'pipe'] },
  );
  console.log(
    'Database checks passed: 18 client/server replays, RLS, forged scores, idempotency, private profiles, invitations, cloud restore, moderation, and audit history. All fixtures rolled back.',
  );
} catch (error) {
  if (error && typeof error === 'object' && 'stderr' in error)
    console.error(String(error.stderr));
  throw new Error('Database integration checks failed');
}
