import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Label } from '@/components/ui';
import { requireSupabase } from '@/lib/supabase';
import { useCommunity } from './CommunityProvider';
import {
  c,
  CommunityScreen,
  Field,
  Notice,
  OnlineGate,
  ResourceStatus,
  unwrap,
  useResource,
  useTask,
} from './components';
import { validUsername } from './validation';

type Moderation =
  | { kind: 'run'; id: string; hidden: boolean }
  | { kind: 'player'; username: string; excluded: boolean };
function Dashboard() {
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<Moderation | null>(null);
  const [reason, setReason] = useState('');
  const [username, setUsername] = useState('');
  const task = useTask();
  const overview = useResource(
    String(page),
    useCallback(
      () =>
        unwrap(
          requireSupabase().rpc('admin_overview', { p_offset: page * 25 }),
        ),
      [page],
    ),
  );
  const choose = (value: Moderation) => {
    setSelection(value);
    setReason('');
  };
  return (
    <>
      <ResourceStatus {...overview} />
      <Notice message={task.error} error />
      {selection && (
        <View style={c.card}>
          <Label>REVIEW ACTION</Label>
          <Text style={c.heading}>
            {selection.kind === 'run'
              ? `${selection.hidden ? 'Hide' : 'Restore'} run ${selection.id}`
              : `${selection.excluded ? 'Exclude' : 'Restore'} @${selection.username}`}
          </Text>
          <Text style={c.body}>
            Hiding a run removes it from ranked totals. Excluding a player
            removes their public card and ranking and stops new ranked runs and
            invitations. Every action is audited.
          </Text>
          <Field
            label="Reason (5–500 characters)"
            multiline
            value={reason}
            onChangeText={setReason}
            maxLength={500}
          />
          <Button
            title={task.busy ? 'Applying…' : 'Confirm action'}
            disabled={task.busy}
            onPress={() =>
              void task.run(async () => {
                if (reason.trim().length < 5)
                  throw new Error(
                    'Give a clear reason of at least 5 characters.',
                  );
                if (selection.kind === 'run')
                  await unwrap(
                    requireSupabase().rpc('admin_moderate_run', {
                      p_run: selection.id,
                      p_hidden: selection.hidden,
                      p_reason: reason.trim(),
                    }),
                  );
                else {
                  if (!validUsername(selection.username))
                    throw new Error('Enter a valid username.');
                  await unwrap(
                    requireSupabase().rpc('admin_moderate_player', {
                      p_username: selection.username,
                      p_excluded: selection.excluded,
                      p_reason: reason.trim(),
                    }),
                  );
                }
                setSelection(null);
                overview.reload();
              })
            }
          />
          <Button
            secondary
            title="Cancel"
            disabled={task.busy}
            onPress={() => setSelection(null)}
          />
        </View>
      )}
      {overview.data && (
        <>
          <View style={c.card}>
            <Text style={c.heading}>
              {overview.data.players.toLocaleString()} pilots ·{' '}
              {overview.data.runs.toLocaleString()} verified runs
            </Text>
            <Button
              secondary
              title="Refresh dashboard"
              icon="refresh"
              onPress={overview.reload}
            />
          </View>
          <View style={c.card}>
            <Text style={c.heading}>Player moderation</Text>
            <Field
              label="Exact username"
              value={username}
              onChangeText={(value) => setUsername(value.toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
            />
            <Button
              secondary
              title="Review exclusion"
              disabled={task.busy || !validUsername(username)}
              onPress={() =>
                choose({ kind: 'player', username, excluded: true })
              }
            />
            <Button
              secondary
              title="Review restoration"
              disabled={task.busy || !validUsername(username)}
              onPress={() =>
                choose({ kind: 'player', username, excluded: false })
              }
            />
          </View>
          <Text style={c.heading}>Recent verified runs</Text>
          {!overview.data.recent.length && (
            <Text style={c.body}>No runs on this page yet.</Text>
          )}
          {overview.data.recent.map((run) => (
            <View key={run.id} style={c.card}>
              <View style={c.row}>
                <Text style={c.heading}>@{run.username}</Text>
                <Label>
                  {run.hidden
                    ? 'HIDDEN'
                    : run.excluded
                      ? 'EXCLUDED'
                      : 'VERIFIED'}
                </Label>
              </View>
              <Text style={c.body}>
                Trail {run.level_id} · {run.points} points · {run.stars} stars ·{' '}
                {run.moves} moves{'\n'}
                {new Date(run.created_at).toLocaleString()}
              </Text>
              <Text selectable style={c.body}>
                {run.id}
              </Text>
              <Button
                secondary
                title={
                  run.hidden
                    ? 'Review run restoration'
                    : 'Review hiding this run'
                }
                disabled={task.busy}
                onPress={() =>
                  choose({ kind: 'run', id: run.id, hidden: !run.hidden })
                }
              />
            </View>
          ))}
          <View style={c.row}>
            <Button
              title="Previous"
              secondary
              disabled={!page}
              onPress={() => setPage((value) => value - 1)}
            />
            <Button
              title="Next"
              secondary
              disabled={overview.data.recent.length < 25 || page >= 400}
              onPress={() => setPage((value) => value + 1)}
            />
          </View>
          <View style={c.card}>
            <Text style={c.heading}>Latest moderation actions</Text>
            {!overview.data.audit.length && (
              <Text style={c.body}>No moderation actions yet.</Text>
            )}
            {overview.data.audit.map((entry, i) => (
              <View key={`${entry.created_at}:${i}`} style={{ gap: 5 }}>
                <Text style={c.label}>
                  {entry.action.replaceAll('_', ' ')} ·{' '}
                  {new Date(entry.created_at).toLocaleString()}
                </Text>
                <Text selectable style={c.body}>
                  {entry.target}
                </Text>
                <Text style={c.body}>{entry.reason}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </>
  );
}
export default function AdminScreen() {
  const { session, isAdmin } = useCommunity();
  return (
    <CommunityScreen
      title="Mission control."
      subtitle="Manage fair play. Keep a record of every decision."
    >
      <OnlineGate>
        {!session ? (
          <Button
            title="Sign in to continue"
            onPress={() => router.push('/account')}
          />
        ) : isAdmin ? (
          <Dashboard key={session.user.id} />
        ) : (
          <View style={c.card}>
            <Text style={c.heading}>Admin access required</Text>
            <Text style={c.body}>
              This account does not have an administrator role. Only the project
              owner can provision one.
            </Text>
          </View>
        )}
      </OnlineGate>
    </CommunityScreen>
  );
}
