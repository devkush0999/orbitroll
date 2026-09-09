import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Label } from '@/components/ui';
import { requireSupabase } from '@/lib/supabase';
import {
  c,
  CommunityScreen,
  Notice,
  OnlineGate,
  ResourceStatus,
  Stats,
  unwrap,
  useResource,
  useTask,
} from './components';
import { useCommunity } from './CommunityProvider';
import { validInvite, validUsername } from './validation';
import { sharePlayerLink } from './share';

function Player({ username }: { username: string }) {
  const data = useResource(
    username,
    useCallback(
      () =>
        unwrap(requireSupabase().rpc('player_card', { p_username: username })),
      [username],
    ),
  );
  const task = useTask();
  const [notice, setNotice] = useState('');
  return (
    <>
      <ResourceStatus {...data} />
      {data.data ? (
        <View style={c.card}>
          <Label>PLAYER CARD</Label>
          <Text style={c.title}>{data.data.display_name}</Text>
          <Text style={c.body}>@{data.data.username}</Text>
          <Stats {...data.data} />
          <Notice message={notice} />
          <Notice message={task.error} error />
          <Button
            title="Share this player card"
            icon="share-outline"
            disabled={task.busy}
            onPress={() =>
              void task.run(async () =>
                setNotice(
                  await sharePlayerLink(
                    `Explore ${data.data!.display_name}'s Orbit Roll journey.`,
                    `/player/${username}`,
                  ),
                ),
              )
            }
          />
          <Button
            secondary
            title="See the rankings"
            onPress={() => router.push('/leaderboard')}
          />
        </View>
      ) : !data.loading && !data.error ? (
        <Text style={c.body}>
          This player card is private or no longer available.
        </Text>
      ) : null}
    </>
  );
}
export function PlayerScreen() {
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  return (
    <CommunityScreen
      title="Every roll leaves a story."
      subtitle="A pilot’s best verified runs, all in one place."
    >
      <OnlineGate>
        {validUsername(username) ? (
          <Player username={username} />
        ) : (
          <Text style={c.body}>This player link is invalid.</Text>
        )}
      </OnlineGate>
    </CommunityScreen>
  );
}
function Invitation({ code }: { code: string }) {
  const { session, profile } = useCommunity();
  const invite = useResource(
    code,
    useCallback(
      () => unwrap(requireSupabase().rpc('invite_details', { p_code: code })),
      [code],
    ),
  );
  const [accepted, setAccepted] = useState(false);
  const task = useTask();
  return (
    <>
      <ResourceStatus {...invite} />
      {invite.data ? (
        <View style={c.card}>
          <Label>YOU’RE INVITED</Label>
          <Text style={c.title}>
            {invite.data.display_name} saved you a spot.
          </Text>
          <Text style={c.body}>
            Connect with @{invite.data.username} to add each other to your
            crews. You’ll see each other’s names; rankings only include scores
            you’ve made public.
          </Text>
          <Notice message={task.error} error />
          {accepted ? (
            <>
              <Notice message="You’re connected. Welcome to the crew." />
              <Button
                title="Meet your crew"
                onPress={() => router.replace('/leaderboard')}
              />
            </>
          ) : profile?.invite_code === code ? (
            <Text style={c.body}>
              This is your invitation. Share the link with a friend.
            </Text>
          ) : (
            <Button
              title={
                task.busy
                  ? 'Connecting…'
                  : session
                    ? 'Accept & connect'
                    : 'Sign in to accept'
              }
              disabled={task.busy}
              icon="people-outline"
              onPress={() => {
                if (!session) {
                  router.push({
                    pathname: '/account',
                    params: { invite: code },
                  });
                  return;
                }
                void task.run(async () => {
                  const { error } = await requireSupabase().rpc(
                    'accept_invite',
                    { p_code: code },
                  );
                  if (error)
                    throw new Error(
                      error.code === 'P0001'
                        ? error.message
                        : 'Could not accept the invite. Please retry.',
                    );
                  setAccepted(true);
                });
              }}
            />
          )}
          <Button
            secondary
            title="Explore the game first"
            onPress={() => router.push('/how-to-play')}
          />
        </View>
      ) : !invite.loading && !invite.error ? (
        <Text style={c.body}>This invitation is no longer available.</Text>
      ) : null}
    </>
  );
}
export function InviteScreen() {
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  return (
    <CommunityScreen
      title="Space is better together."
      subtitle="An invitation to take the next trail with a friend."
    >
      <OnlineGate>
        {validInvite(code) ? (
          <Invitation key={code} code={code} />
        ) : (
          <Text style={c.body}>This invitation link is invalid.</Text>
        )}
      </OnlineGate>
    </CommunityScreen>
  );
}
