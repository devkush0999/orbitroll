import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Label } from '@/components/ui';
import { requireSupabase } from '@/lib/supabase';
import { useCommunity } from './CommunityProvider';
import {
  c,
  CommunityScreen,
  Notice,
  OnlineGate,
  ResourceStatus,
  unwrap,
  useResource,
  useTask,
} from './components';

function Rankings() {
  const { session } = useCommunity();
  const [friends, setFriends] = useState(false);
  const [page, setPage] = useState(0);
  const [remove, setRemove] = useState<string | null>(null);
  const task = useTask();
  const ranking = useResource(
    `${session?.user.id}:${friends}:${page}`,
    useCallback(
      () =>
        unwrap(
          requireSupabase().rpc('leaderboard', {
            p_friends: friends,
            p_limit: 25,
            p_offset: page * 25,
          }),
        ),
      [friends, page],
    ),
  );
  const crew = useResource(
    session?.user.id ?? 'guest',
    useCallback(
      () =>
        session
          ? unwrap(requireSupabase().rpc('my_connections'))
          : Promise.resolve([]),
      [session],
    ),
  );
  return (
    <>
      <View style={c.row}>
        <View style={{ flex: 1 }}>
          <Button
            title="Everyone"
            secondary={friends}
            onPress={() => {
              setFriends(false);
              setPage(0);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="My crew"
            secondary={!friends}
            disabled={!session}
            onPress={() => {
              setFriends(true);
              setPage(0);
            }}
          />
        </View>
      </View>
      <Text style={c.body}>
        Best score per trail, added together. Each star earns 1,000 points;
        efficient moves add a bonus. Equal scores share a rank. Only public
        profiles appear.
      </Text>
      <ResourceStatus {...ranking} />
      {ranking.data && (
        <View style={c.card}>
          <View style={c.row}>
            <Label>
              {friends ? 'YOUR CREW · GLOBAL RANK' : 'GLOBAL RANKING'}
            </Label>
            <Label>POINTS</Label>
          </View>
          {ranking.data.length === 0 && (
            <Text style={c.body}>
              {page
                ? 'No more pilots on this page.'
                : 'The sky is open. Finish a ranked trail and make your profile public to appear here.'}
            </Text>
          )}
          {ranking.data.map((player) => (
            <Pressable
              key={player.user_id}
              accessibilityRole="button"
              accessibilityLabel={`Rank ${player.rank}, ${player.display_name}, ${player.points} points`}
              onPress={() =>
                router.push({
                  pathname: '/player/[username]',
                  params: { username: player.username },
                })
              }
              style={[c.row, { minHeight: 68 }]}
            >
              <Text style={[c.number, { fontSize: 23, minWidth: 38 }]}>
                {String(player.rank).padStart(2, '0')}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={c.label}>
                  {player.display_name}
                  {player.user_id === session?.user.id ? ' · you' : ''}
                </Text>
                <Text style={c.body}>
                  @{player.username} · {player.levels} trails
                </Text>
              </View>
              <Text style={c.label}>{player.points.toLocaleString()}</Text>
            </Pressable>
          ))}
          <View style={c.row}>
            <Button
              secondary
              title="Previous"
              disabled={!page || ranking.loading}
              onPress={() => setPage((value) => value - 1)}
            />
            <Button
              secondary
              title="Next"
              disabled={
                ranking.data.length < 25 || page >= 400 || ranking.loading
              }
              onPress={() => setPage((value) => value + 1)}
            />
          </View>
          <Button
            secondary
            title="Refresh rankings"
            icon="refresh"
            onPress={ranking.reload}
          />
        </View>
      )}
      {!session && (
        <Button
          title="Sign in to join the ranking"
          onPress={() => router.push('/account')}
        />
      )}
      {session && (
        <View style={c.card}>
          <Text style={c.heading}>Your crew</Text>
          <Text style={c.body}>
            Connections appear here even if they keep their scores private.
          </Text>
          <ResourceStatus {...crew} />
          <Notice message={task.error} error />
          {crew.data?.length === 0 && (
            <Text style={c.body}>
              Share an invite from your profile. Your friend chooses whether to
              connect.
            </Text>
          )}
          {crew.data?.map((friend) => (
            <View key={friend.user_id} style={{ gap: 9 }}>
              <Text style={c.label}>
                {friend.display_name} · @{friend.username}
              </Text>
              <Button
                secondary
                title={
                  remove === friend.user_id
                    ? 'Confirm disconnect'
                    : 'Disconnect'
                }
                disabled={task.busy}
                icon="close"
                onPress={() => {
                  if (remove !== friend.user_id) {
                    setRemove(friend.user_id);
                    return;
                  }
                  void task.run(async () => {
                    await unwrap(
                      requireSupabase().rpc('disconnect_player', {
                        p_user: friend.user_id,
                      }),
                    );
                    setRemove(null);
                    crew.reload();
                    ranking.reload();
                  });
                }}
              />
            </View>
          ))}
          <Button
            title="Invite a friend"
            icon="person-add-outline"
            onPress={() => router.push('/account')}
          />
        </View>
      )}
    </>
  );
}
export default function LeaderboardScreen() {
  return (
    <CommunityScreen
      title="A little friendly gravity."
      subtitle="Find your people. Chase your next personal best."
    >
      <OnlineGate>
        <Rankings />
      </OnlineGate>
    </CommunityScreen>
  );
}
