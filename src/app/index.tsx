import { Redirect, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, IconButton, Label } from '@/components/ui';
import { TrailPreview } from '@/features/game/components/TrailPreview';
import { TrailMark } from '@/features/game/components/TrailMark';
import { colors, fonts } from '@/theme/tokens';
import { useAppSelector } from '@/store';
import { levels, VERTICAL_ENTRY_LEVEL } from '@/features/game/levels';

export default function HomeScreen() {
  const { results, onboardingComplete } = useAppSelector(
    (state) => state.progress,
  );
  const completed = Object.keys(results).length;
  const next = levels.find((level) => !results[level.id]) ?? levels[0]!;
  const stars = Object.values(results).reduce(
    (sum, result) => sum + result.stars,
    0,
  );
  const descent = levels[VERTICAL_ENTRY_LEVEL - 1]!;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  return (
    <Screen style={{ gap: 20 }}>
      <View style={s.header}>
        <View style={s.brand}>
          <Ionicons name="cube-outline" size={23} color={colors.accent} />
          <Text style={s.wordmark}>
            orbit roll<Text style={{ color: colors.accent }}>.</Text>
          </Text>
        </View>
        <IconButton
          name="options-outline"
          label="Open settings"
          onPress={() => router.push('/settings')}
        />
      </View>
      <View style={s.heading}>
        <View style={s.header}>
          <Label>
            {completed === levels.length
              ? 'PLAY IT AGAIN'
              : completed
                ? 'PICK UP HERE'
                : 'YOUR FIRST TRAIL'}
          </Label>
          <Text style={s.index}>
            {String(next.id).padStart(2, '0')}
            <Text style={s.total}> / 18</Text>
          </Text>
        </View>
        <Text accessibilityRole="header" style={s.title}>
          {next.name}
          <Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <Text style={s.description}>{next.description}</Text>
      </View>
      <View style={s.art}>
        <TrailPreview key={next.id} level={next} height={280} />
        <View pointerEvents="none" style={s.artCaption}>
          <View style={s.dot} />
          <Text style={s.caption}>A glimpse of the trail ahead</Text>
        </View>
      </View>
      <Button
        title={completed ? 'Keep going' : 'Start rolling'}
        icon="play"
        onPress={() =>
          router.push({ pathname: '/play/[id]', params: { id: next.id } })
        }
      />
      <Button
        title="Rankings & your crew"
        secondary
        icon="people-outline"
        onPress={() => router.push('/leaderboard')}
      />
      <Button
        title="From the crew · media"
        secondary
        icon="images-outline"
        onPress={() => router.push('/media')}
      />
      <View style={s.links}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse all trails"
          onPress={() => router.push('/levels')}
          style={({ pressed }) => [s.link, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={s.linkText}>All trails</Text>
          <Ionicons name="arrow-forward" size={17} color={colors.muted} />
        </Pressable>
        <View style={s.divider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How to play"
          onPress={() => router.push('/how-to-play')}
          style={({ pressed }) => [s.link, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={s.linkText}>How to play</Text>
          <Ionicons name="help-circle-outline" size={18} color={colors.muted} />
        </Pressable>
      </View>
      {next.id < VERTICAL_ENTRY_LEVEL && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play vertical expeditions"
          onPress={() =>
            router.push({ pathname: '/play/[id]', params: { id: descent.id } })
          }
          style={({ pressed }) => [s.sideTrail, { opacity: pressed ? 0.6 : 1 }]}
        >
          <TrailMark level={descent} color={colors.cyan} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.sideTitle}>Or, take the long way down.</Text>
            <Text style={s.caption}>Try your first gravity drop</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.cyan} />
        </Pressable>
      )}
      <View style={s.footer}>
        <Text style={s.caption}>
          {completed} of {levels.length} trails finished
        </Text>
        <View style={s.brand}>
          <Ionicons name="star" size={13} color={colors.accent} />
          <Text style={s.caption}>
            {stars} / {levels.length * 3}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wordmark: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 23,
    letterSpacing: -1,
  },
  heading: { gap: 12, marginTop: 14 },
  index: { fontFamily: fonts.medium, color: colors.text, fontSize: 16 },
  total: { color: colors.muted, fontSize: 12 },
  title: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 46,
    lineHeight: 51,
    letterSpacing: -2,
  },
  description: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  art: { marginHorizontal: -12, overflow: 'hidden' },
  artCaption: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 4,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  caption: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 18,
  },
  links: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  link: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  linkText: { fontFamily: fonts.medium, color: colors.text, fontSize: 14 },
  divider: { height: 18, width: 1, backgroundColor: colors.border },
  sideTrail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 22,
    paddingBottom: 6,
  },
  sideTitle: {
    fontFamily: fonts.medium,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
});
