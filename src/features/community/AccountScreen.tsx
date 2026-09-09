import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Switch, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { requireSupabase } from '@/lib/supabase';
import { colors } from '@/theme/tokens';
import { useCommunity } from './CommunityProvider';
import {
  c,
  CommunityScreen,
  Field,
  Notice,
  OnlineGate,
  ResourceStatus,
  useResource,
  useTask,
} from './components';
import { validInvite, validUsername } from './validation';
import { discardRun, flushRuns, getPendingRuns } from './runQueue';
import { sharePlayerLink } from './share';

function SignIn() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const task = useTask();
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const send = () =>
    task.run(async () => {
      const address = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
        throw new Error('Enter a valid email address.');
      const { error } = await requireSupabase().auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: true },
      });
      if (error)
        throw new Error(
          'Could not send a code. Check your email address, wait a moment, and retry.',
        );
      setSentTo(address);
      setCode('');
      setCooldown(60);
    });
  return (
    <View style={c.card}>
      <Text style={c.heading}>A little space of your own.</Text>
      <Text style={c.body}>
        Save ranked runs across devices and invite friends. Your profile starts
        private. Guest runs stay on this device; sign in before playing to
        submit a ranked run.
      </Text>
      {!sentTo ? (
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          maxLength={254}
          editable={!task.busy}
        />
      ) : (
        <>
          <Text style={c.body}>Enter the email code sent to {sentTo}.</Text>
          <Field
            label="Email code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={8}
            editable={!task.busy}
          />
        </>
      )}
      <Notice message={task.error} error />
      <Button
        title={
          task.busy
            ? 'One moment…'
            : sentTo
              ? 'Verify & continue'
              : 'Email me a code'
        }
        disabled={task.busy}
        onPress={() => {
          if (!sentTo) {
            void send();
            return;
          }
          void task.run(async () => {
            if (!/^\d{6,8}$/.test(code))
              throw new Error('Enter the 6–8 digit code from your email.');
            const { error } = await requireSupabase().auth.verifyOtp({
              email: sentTo,
              token: code,
              type: 'email',
            });
            if (error)
              throw new Error(
                'That code is invalid or expired. Request a new code and try again.',
              );
            if (invite && validInvite(invite))
              router.replace({
                pathname: '/invite/[code]',
                params: { code: invite },
              });
          });
        }}
      />
      {!!sentTo && (
        <>
          <Button
            secondary
            title={cooldown ? `Resend in ${cooldown}s` : 'Resend code'}
            disabled={task.busy || cooldown > 0}
            onPress={() => void send()}
          />
          <Button
            secondary
            title="Use another email"
            disabled={task.busy}
            onPress={() => setSentTo('')}
          />
        </>
      )}
      <Text style={c.body}>
        We use your email for sign-in. Your email is never shown on player cards
        or rankings.
      </Text>
      <Button
        secondary
        title="Privacy & data"
        icon="shield-checkmark-outline"
        onPress={() => router.push('/privacy')}
      />
    </View>
  );
}
function Pilot() {
  const { session, profile, notice, isAdmin, refresh } = useCommunity();
  const user = session!.user.id;
  const [draftUsername, setUsername] = useState<string | null>(null);
  const [draftName, setName] = useState<string | null>(null);
  const [draftPublic, setPublic] = useState<boolean | null>(null);
  const username = draftUsername ?? profile?.username ?? '';
  const name = draftName ?? profile?.display_name ?? '';
  const isPublic = draftPublic ?? profile?.is_public ?? false;
  const [message, setMessage] = useState('');
  const [discard, setDiscard] = useState<string | null>(null);
  const task = useTask();
  const pending = useResource(
    user,
    useCallback(() => getPendingRuns(user), [user]),
  );
  return (
    <>
      <Notice message={notice} />
      <Notice message={message} />
      <Notice message={task.error} error />
      {profile ? (
        <View style={c.card}>
          <Text style={c.heading}>Your pilot profile</Text>
          <Field
            label="Display name"
            value={name}
            onChangeText={setName}
            maxLength={32}
          />
          <Field
            label="Username"
            value={username}
            onChangeText={(value) => setUsername(value.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
          />
          <View style={c.row}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={c.label}>Public player card & rankings</Text>
              <Text style={c.body}>
                Show your name, username, stars, and score to everyone. You can
                turn this off at any time.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Public player card and rankings"
              value={isPublic}
              onValueChange={setPublic}
              trackColor={{ true: colors.accent }}
            />
          </View>
          <Button
            title={task.busy ? 'Saving…' : 'Save profile'}
            disabled={task.busy}
            onPress={() =>
              void task.run(async () => {
                if (!validUsername(username))
                  throw new Error(
                    'Use 3–24 lowercase letters, numbers, or underscores.',
                  );
                if (!name.trim()) throw new Error('Enter a display name.');
                const { error } = await requireSupabase()
                  .from('profiles')
                  .update({
                    username,
                    display_name: name.trim(),
                    is_public: isPublic,
                  })
                  .eq('id', user)
                  .select('id')
                  .single();
                if (error)
                  throw new Error(
                    error.code === '23505'
                      ? 'That username is taken. Try another.'
                      : 'Could not save your profile. Please retry.',
                  );
                await refresh();
                setMessage('Profile saved.');
              })
            }
          />
          <Button
            secondary
            title="Invite someone to your crew"
            icon="person-add-outline"
            disabled={task.busy}
            onPress={() =>
              void task.run(async () =>
                setMessage(
                  await sharePlayerLink(
                    `${profile.display_name} invited you to Orbit Roll.`,
                    `/invite/${profile.invite_code}`,
                  ),
                ),
              )
            }
          />
          <Text style={c.body}>
            Anyone with your invitation link can see your name and choose to
            connect. Share it with people you want in your crew.
          </Text>
          {profile.is_public && (
            <Button
              secondary
              title="Share my player card"
              icon="share-outline"
              onPress={() =>
                void task.run(async () =>
                  setMessage(
                    await sharePlayerLink(
                      `Follow ${profile.display_name}'s journey on Orbit Roll.`,
                      `/player/${profile.username}`,
                    ),
                  ),
                )
              }
            />
          )}
        </View>
      ) : (
        <Button title="Retry loading profile" onPress={() => void refresh()} />
      )}
      <View style={c.card}>
        <Text style={c.heading}>Ranked run uploads</Text>
        <Text style={c.body}>
          Your best verified score on each trail counts. Offline runs wait here
          until you reconnect. Device times and practice runs are not ranked.
        </Text>
        <ResourceStatus {...pending} />
        {pending.data && (
          <Text style={c.body}>
            {pending.data.length
              ? `${pending.data.length} runs waiting to upload`
              : 'No runs waiting. You’re ready for the next trail.'}
          </Text>
        )}
        <Button
          title="Sync & refresh"
          icon="refresh"
          disabled={task.busy}
          onPress={() =>
            void task.run(async () => {
              const result = await flushRuns(user);
              setMessage(result.error ?? `${result.uploaded} runs uploaded.`);
              await refresh();
              pending.reload();
            })
          }
        />
        {pending.data?.map((run) => (
          <View key={run.id} style={{ gap: 10 }}>
            <Text style={c.body}>
              Trail {run.level} · {run.directions.length} moves
            </Text>
            <Button
              secondary
              title={
                discard === run.id
                  ? 'Confirm removal from upload queue'
                  : 'Remove queued run'
              }
              disabled={task.busy}
              icon="close"
              onPress={() => {
                if (discard !== run.id) {
                  setDiscard(run.id);
                  return;
                }
                void task.run(async () => {
                  await discardRun(user, run.id);
                  setDiscard(null);
                  pending.reload();
                });
              }}
            />
          </View>
        ))}
      </View>
      <Button
        title="Rankings & crew"
        secondary
        onPress={() => router.push('/leaderboard')}
      />
      {isAdmin && (
        <Button
          title="Open admin panel"
          secondary
          icon="shield-outline"
          onPress={() => router.push('/admin')}
        />
      )}
      <Button
        title="Sign out on this device"
        secondary
        icon="log-out-outline"
        disabled={task.busy}
        onPress={() =>
          void task.run(async () => {
            const { error } = await requireSupabase().auth.signOut({
              scope: 'local',
            });
            if (error) throw new Error('Could not sign out. Please retry.');
          })
        }
      />
    </>
  );
}
export default function AccountScreen() {
  const { session } = useCommunity();
  return (
    <CommunityScreen
      title="Your place in orbit."
      subtitle="A shared journey starts with your next roll."
    >
      <OnlineGate>
        {session ? <Pilot key={session.user.id} /> : <SignIn />}
      </OnlineGate>
    </CommunityScreen>
  );
}
