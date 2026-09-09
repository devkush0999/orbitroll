import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { IconButton, Label, Stars } from '@/components/ui';
import { TrailMark } from '@/features/game/components/TrailMark';
import { getDropCount, levels } from '@/features/game/levels';
import { isUnlocked, useAppSelector } from '@/store';
import { colors, fonts } from '@/theme/tokens';
export default function LevelsScreen() {
  const results = useAppSelector((state) => state.progress.results);
  return (
    <Screen>
      <View style={s.row}>
        <IconButton
          name="arrow-back"
          label="Back to home"
          onPress={() => router.replace('/')}
        />
        <Label>THE FLIGHT PLAN</Label>
        <View style={{ width: 46 }} />
      </View>
      <View style={{ gap: 10 }}>
        <Text style={s.title}>Pick a trail.</Text>
        <Text style={s.body}>
          {Object.keys(results).length} of {levels.length} finished. Replay any
          completed trail.
        </Text>
      </View>
      {levels.map((level, i) => {
        const unlocked = isUnlocked(level.id, results);
        const result = results[level.id];
        return (
          <View key={level.id} style={{ gap: 16 }}>
            {i % 3 === 0 && (
              <View style={{ marginTop: 12 }}>
                <Label color={colors.cyan}>
                  0{Math.floor(i / 3) + 1} / {level.sector}
                </Label>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Level ${level.id}, ${level.name}${unlocked ? '' : ', locked'}`}
              accessibilityState={{ disabled: !unlocked }}
              disabled={!unlocked}
              onPress={() =>
                router.push({
                  pathname: '/play/[id]',
                  params: { id: level.id },
                })
              }
              style={({ pressed }) => [
                s.card,
                { opacity: unlocked ? (pressed ? 0.7 : 1) : 0.45 },
                unlocked && !result && { backgroundColor: '#15251F' },
              ]}
            >
              <View
                style={[s.number, result && { backgroundColor: '#233A2D' }]}
              >
                <Text
                  style={[s.numberText, result && { color: colors.accent }]}
                >
                  {String(level.id).padStart(2, '0')}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={s.name}>{level.name}</Text>
                <Text style={s.body}>
                  {level.path.length - 1} rolls
                  {getDropCount(level) ? ` · ${getDropCount(level)} drops` : ''}
                  {level.lifts.length ? ` · ${level.lifts.length} lifts` : ''}
                </Text>
                {result ? (
                  <Stars count={result.stars} />
                ) : (
                  <Text style={s.status}>
                    {unlocked
                      ? 'Ready when you are'
                      : `Finish level ${level.id - 1} to unlock`}
                  </Text>
                )}
              </View>
              <TrailMark
                level={level}
                color={
                  result ? colors.accent : unlocked ? colors.cyan : colors.muted
                }
              />
              <Ionicons
                name={
                  unlocked
                    ? result
                      ? 'checkmark-circle'
                      : 'arrow-forward'
                    : 'lock-closed-outline'
                }
                size={22}
                color={result ? colors.accent : colors.muted}
              />
            </Pressable>
          </View>
        );
      })}
      <Text style={[s.body, { textAlign: 'center', marginTop: 8 }]}>
        18 trails. No need to rush.
      </Text>
    </Screen>
  );
}
const s = StyleSheet.create({
  status: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 35,
    lineHeight: 41,
    color: colors.text,
    letterSpacing: -1.4,
  },
  body: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
  },
  card: {
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  number: {
    width: 36,
    height: 40,
    backgroundColor: 'transparent',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontFamily: fonts.bold, fontSize: 17, color: colors.muted },
  name: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
});
