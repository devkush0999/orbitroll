import { useState } from 'react';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, IconButton, Label } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { useAppSelector } from '@/store';
import { levels } from '../game/levels';
import { lessons } from './lessons';
import { PracticeLesson } from './PracticeLesson';

const directions = [
  { arrow: '↖', title: 'West' },
  { arrow: '↗', title: 'North' },
  { arrow: '↙', title: 'South' },
  { arrow: '↘', title: 'East' },
] as const;

export default function GuideScreen() {
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const results = useAppSelector((root) => root.progress.results);
  const next = levels.find((level) => !results[level.id]) ?? levels[0]!;
  const lesson = lessons[active]!;
  const selectLesson = (index: number) => {
    setInteracting(false);
    setActive(index);
  };
  return (
    <Screen key={active} scrollEnabled={!interacting}>
      <View style={s.header}>
        <IconButton
          name="arrow-back"
          label="Close how to play"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/')
          }
        />
        <Label>FLIGHT SCHOOL</Label>
        <View style={{ width: 46 }} />
      </View>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={s.title}>
          A quick warm-up.
        </Text>
        <Text style={s.body}>
          Learn the moves, then try them here. No timer to beat. No progress to
          lose.
        </Text>
      </View>
      <View style={s.tabs}>
        {lessons.map((item, index) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={`${index + 1}. ${item.title}`}
            accessibilityState={{ selected: active === index }}
            onPress={() => selectLesson(index)}
            style={[s.tab, active === index && s.selected]}
          >
            <Text
              style={[s.tabText, active === index && { color: colors.accent }]}
            >
              {String(index + 1).padStart(2, '0')}
            </Text>
            <Text
              style={[s.tabText, active === index && { color: colors.text }]}
            >
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
      <View accessibilityLiveRegion="polite" style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={s.heading}>
          {lesson.heading}
        </Text>
        <Text style={s.body}>{lesson.description}</Text>
      </View>
      {lesson.id === 'roll' && (
        <View style={s.directionGrid}>
          {directions.map((item) => (
            <View key={item.title} style={s.direction}>
              <Text style={s.arrow}>{item.arrow}</Text>
              <Text style={s.directionText}>{item.title}</Text>
            </View>
          ))}
        </View>
      )}
      <PracticeLesson
        key={lesson.id}
        lesson={lesson}
        onInteract={setInteracting}
      />
      {active < lessons.length - 1 && (
        <Button
          title={`Next lesson · ${lessons[active + 1]!.title}`}
          onPress={() => selectLesson(active + 1)}
        />
      )}
      <View style={s.card}>
        <View style={s.cardHeading}>
          <Ionicons name="expand-outline" size={23} color={colors.cyan} />
          <Text style={s.cardTitle}>More room to explore</Text>
        </View>
        <Text style={s.body}>
          Tap expand at the top-left during a level for fullscreen. Tap contract
          to leave it. Pause is always at the top-right, and the controller icon
          brings the buttons back.
        </Text>
      </View>
      <View style={s.card}>
        <View style={s.cardHeading}>
          <Ionicons name="bulb-outline" size={23} color="#FFD38E" />
          <Text style={s.cardTitle}>Keep these in your orbit</Text>
        </View>
        <Text style={s.body}>
          • Wait for a roll or landing to finish before moving again.{'\n'}• A
          platform farther sideways cannot catch your fall.{'\n'}• Backtracking
          is allowed; crystals are collected only once.{'\n'}• Use Settings for
          swipe distance, hints, or reduced motion.
        </Text>
      </View>
      {Platform.OS === 'web' && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Keyboard shortcuts in levels</Text>
          <Text style={s.body}>
            Arrows / WASD: roll{'\n'}Q / Page Up: lift up{'\n'}E / Page Down:
            lift down{'\n'}Escape: pause a level
          </Text>
        </View>
      )}
      <Button
        title={`Play level ${String(next.id).padStart(2, '0')}`}
        icon="play"
        onPress={() =>
          router.replace({ pathname: '/play/[id]', params: { id: next.id } })
        }
      />
      <Button
        title="Back to the universe"
        secondary
        icon="planet-outline"
        onPress={() => router.replace('/')}
      />
      <Text style={s.footer}>
        These practice trails never change your saved progress.
      </Text>
    </Screen>
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 35,
    lineHeight: 41,
    letterSpacing: -1.3,
  },
  heading: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 23,
  },
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: {
    flex: 1,
    minWidth: 64,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.panel,
  },
  selected: { backgroundColor: '#21342B', borderColor: '#779857' },
  tabText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  directionGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  direction: {
    flex: 1,
    minWidth: 60,
    backgroundColor: colors.panel,
    borderRadius: 15,
    alignItems: 'center',
    padding: 12,
    gap: 7,
  },
  arrow: { fontSize: 26, color: colors.cyan },
  directionText: { color: colors.text, fontFamily: fonts.medium, fontSize: 11 },
  card: {
    padding: 20,
    gap: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 21,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
    flexShrink: 1,
  },
  footer: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: 'center',
    lineHeight: 18,
  },
});
