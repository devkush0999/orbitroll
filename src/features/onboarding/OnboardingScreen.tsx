import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Button, IconButton, Label } from '@/components/ui';
import { LessonPreview } from '@/features/guide/LessonPreview';
import { lessons } from '@/features/guide/lessons';
import { colors, fonts } from '@/theme/tokens';
import { updatePreferences, useAppDispatch, useAppSelector } from '@/store';

const pages = [
  {
    tag: '01 / FIND YOUR FLOW',
    title: 'Meet your cube.',
    detail:
      'Guide your cube through floating trails. Collect three crystals and reach the glowing portal. The next tiles build as you roll.',
    symbol: '↖  ↗  ↙  ↘',
    hint: 'Swipe diagonally toward the next tile. One swipe, one roll.',
  },
  {
    tag: '02 / A NEW DIMENSION',
    title: 'Watch your step.',
    detail:
      'On a cyan lift pad, swipe straight up to rise or straight down to descend. Gold arrows lead to a safe landing below: roll off the edge and gravity does the rest.',
    symbol: '↑   ◉   ↓',
    hint: 'Vertical swipes only activate connected lifts. Elsewhere, they do nothing.',
  },
  {
    tag: '03 / MAKE SPACE YOURS',
    title: 'Your kind of play.',
    detail:
      'Tap the expand icon during play for fullscreen. Pause stays at the top; the controller icon brings your buttons back whenever you need them.',
    symbol: '⤢',
    hint: 'Choose your controls below. Change them anytime in Settings.',
  },
] as const;

export default function OnboardingScreen() {
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const [page, setPage] = useState(0);
  const preferences = useAppSelector((root) => root.progress);
  const dispatch = useAppDispatch();
  const slide = pages[page]!;
  const finish = (showGuide = false) => {
    if (replay !== '1')
      dispatch(updatePreferences({ onboardingComplete: true }));
    router.replace(
      showGuide ? '/how-to-play' : replay === '1' ? '/settings' : '/',
    );
  };
  return (
    <Screen key={page} style={{ gap: 22 }}>
      <View style={s.header}>
        <Text style={s.brand}>orbit / roll</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => finish()}
          style={s.skip}
        >
          <Text style={s.skipText}>
            {replay === '1' ? 'Close intro' : 'Skip intro'}
          </Text>
        </Pressable>
      </View>
      <View style={s.scene}>
        <LessonPreview
          key={page}
          level={lessons[page === 1 ? 2 : page === 2 ? 3 : 0]!.level}
        />
        <View style={s.sceneLabel}>
          <Label color={colors.accent}>A SHORT LOOK AT WHAT’S AHEAD</Label>
        </View>
      </View>
      <View accessibilityLiveRegion="polite" style={{ gap: 15 }}>
        <Label color={colors.accent}>{slide.tag}</Label>
        <Text accessibilityRole="header" style={s.title}>
          {slide.title}
        </Text>
        <Text style={s.body}>{slide.detail}</Text>
      </View>
      <LinearGradient colors={['#1E3440', '#111D2C']} style={s.lesson}>
        <Text style={s.symbol}>{slide.symbol}</Text>
        <Text style={s.hint}>{slide.hint}</Text>
      </LinearGradient>
      {page === 2 && (
        <View style={s.choices}>
          {(['buttons', 'gestures'] as const).map((controlMode) => (
            <Pressable
              key={controlMode}
              accessibilityRole="radio"
              accessibilityLabel={
                controlMode === 'buttons'
                  ? 'Buttons and swipes'
                  : 'Gestures only'
              }
              accessibilityState={{
                checked: preferences.controlMode === controlMode,
              }}
              onPress={() => dispatch(updatePreferences({ controlMode }))}
              style={[
                s.choice,
                preferences.controlMode === controlMode && {
                  borderColor: colors.accent,
                },
              ]}
            >
              <Ionicons
                name={
                  controlMode === 'buttons'
                    ? 'game-controller-outline'
                    : 'hand-left-outline'
                }
                size={24}
                color={colors.accent}
              />
              <Text style={s.choiceText}>
                {controlMode === 'buttons'
                  ? 'Buttons + swipe'
                  : 'Gestures only'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={s.navigation}>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                s.dot,
                index === page && { width: 26, backgroundColor: colors.accent },
              ]}
            />
          ))}
        </View>
        <Text style={s.skipText}>
          {page + 1} of {pages.length}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {page > 0 && (
          <IconButton
            name="arrow-back"
            label="Previous introduction"
            onPress={() => setPage(page - 1)}
          />
        )}
        <View style={{ flex: 1 }}>
          <Button
            title={page === pages.length - 1 ? 'Learn how to play' : 'Continue'}
            onPress={() =>
              page === pages.length - 1 ? finish(true) : setPage(page + 1)
            }
          />
        </View>
      </View>
      {page === pages.length - 1 && (
        <Button
          title={replay === '1' ? 'Back to settings' : 'Explore on my own'}
          secondary
          icon="planet-outline"
          onPress={() => finish()}
        />
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 23,
    letterSpacing: -0.8,
  },
  skip: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 8 },
  skipText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  scene: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#0B1524',
  },
  sceneLabel: { padding: 15, alignItems: 'center' },
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 37,
    lineHeight: 42,
    letterSpacing: -1.4,
  },
  body: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 23,
  },
  lesson: { padding: 20, borderRadius: 20, gap: 12 },
  symbol: { color: colors.cyan, fontSize: 29, textAlign: 'center' },
  hint: {
    color: '#C8D8E6',
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  choices: { flexDirection: 'row', gap: 12 },
  choice: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  choiceText: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'center',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dot: { width: 7, height: 7, backgroundColor: colors.border, borderRadius: 4 },
});
