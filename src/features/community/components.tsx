import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, IconButton, Label } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';

export function CommunityScreen({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  return <Screen style={{ maxWidth: 900, gap: 22 }}>
    <View style={c.row}><IconButton name="arrow-back" label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /><Label>ORBIT ROLL · CREW</Label><IconButton name="person-outline" label="Your pilot profile" onPress={() => router.push('/account')} /></View>
    <View style={{ gap: 10 }}><Text accessibilityRole="header" style={c.title}>{title}</Text><Text style={c.body}>{subtitle}</Text></View>
    {children}
  </Screen>;
}
export function OnlineGate({ children }: PropsWithChildren) {
  return supabase ? children : <View style={c.card}><Text style={c.heading}>The crew is coming together.</Text><Text style={c.body}>Online profiles, rankings, and invites will open once this build is connected to Supabase. Your local trails are ready to play.</Text><Button title="Explore the trails" onPress={() => router.push('/levels')} /></View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 8 }}><Text style={c.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.muted} selectionColor={colors.accent} style={[c.input, props.style]} /></View>;
}
export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  return message ? <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[c.body, { color: error ? colors.danger : colors.accent }]}>{message}</Text> : null;
}
export function Stats({ points, stars, levels }: { points: number; stars: number; levels: number }) {
  return <View style={[c.row, { flexWrap: 'wrap' }]}>{[[points.toLocaleString(), 'POINTS'], [stars, 'STARS'], [levels, 'TRAILS']].map(([value, label]) => <View key={label} style={{ gap: 6 }}><Text style={c.number}>{value}</Text><Label>{label}</Label></View>)}</View>;
}
export function useTask() {
  const lock = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Could not complete that request. Please retry.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  return { busy, error, run };
}
export async function unwrap<T>(result: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await result;
  if (error) throw new Error('Could not load this right now. Check your connection and retry.');
  return data as NonNullable<T>;
}
export function useResource<T>(key: string, fetcher: () => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ key: string; data: T | null; loading: boolean; error: string }>({ key, data: null, loading: true, error: '' });
  useEffect(() => {
    let alive = true;
    setState({ key, data: null, loading: true, error: '' });
    void fetcher().then(data => { if (alive) setState({ key, data, loading: false, error: '' }); }, () => { if (alive) setState({ key, data: null, loading: false, error: 'Could not load this right now. Check your connection and retry.' }); });
    return () => { alive = false; };
  }, [key, fetcher, version]);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  return { ...(state.key === key ? state : { data: null, loading: true, error: '' }), reload };
}
export function ResourceStatus({ loading, error, reload }: { loading: boolean; error: string; reload: () => void }) {
  return loading ? <ActivityIndicator accessibilityLabel="Loading" color={colors.accent} /> : error ? <View style={c.card}><Notice message={error} error /><Button secondary title="Try again" onPress={reload} /></View> : null;
}
export const c = StyleSheet.create({
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 38, letterSpacing: -1.5, lineHeight: 44 },
  heading: { color: colors.text, fontFamily: fonts.bold, fontSize: 21 },
  body: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 23 },
  label: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  number: { color: colors.accent, fontFamily: fonts.bold, fontSize: 32 },
  card: { padding: 22, borderRadius: 22, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  input: { minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontFamily: fonts.regular, fontSize: 16, paddingHorizontal: 16, paddingVertical: 12 },
  link: { color: colors.cyan, fontFamily: fonts.medium, fontSize: 14 },
});
