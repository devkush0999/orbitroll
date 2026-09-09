import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Direction } from '../types';
import { colors, fonts } from '@/theme/tokens';
export function Controls({
  onMove,
  disabled,
  canRise,
  canDescend,
  showHint = true,
}: {
  onMove: (direction: Direction) => void;
  disabled: boolean;
  canRise: boolean;
  canDescend: boolean;
  showHint?: boolean;
}) {
  const control = (direction: Direction, rotation: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Roll ${direction}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onMove(direction)}
      style={({ pressed }) => [
        s.key,
        pressed && {
          backgroundColor: '#354C45',
          borderColor: colors.accent,
          transform: [{ translateY: 2 }],
        },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Ionicons
        name="arrow-up"
        size={26}
        color={colors.text}
        style={{ transform: [{ rotate: rotation }] }}
      />
    </Pressable>
  );
  const lift = (direction: 'up' | 'down', available: boolean) =>
    available ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={direction === 'up' ? 'Lift up' : 'Lift down'}
        accessibilityState={{ disabled: disabled || !available }}
        disabled={disabled || !available}
        onPress={() => onMove(direction)}
        style={[s.lift, { opacity: available && !disabled ? 1 : 0.24 }]}
      >
        <Ionicons
          name={direction === 'up' ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.cyan}
        />
        <Text style={s.liftText}>{direction === 'up' ? 'RISE' : 'DOWN'}</Text>
      </Pressable>
    ) : (
      <View style={{ width: 48, height: 49 }} />
    );
  return (
    <View style={s.container}>
      <View style={s.pad}>
        <View style={s.row}>
          {control('west', '-60deg')}
          {lift('up', canRise)}
          {control('north', '60deg')}
        </View>
        <View style={s.center}>
          <View style={s.line} />
          <Ionicons name="cube-outline" size={18} color={colors.accent} />
          <View style={s.line} />
        </View>
        <View style={s.row}>
          {control('south', '-120deg')}
          {lift('down', canDescend)}
          {control('east', '120deg')}
        </View>
      </View>
      {showHint && (
        <Text style={s.hint}>Diagonal swipe: roll · Vertical swipe: lift</Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { alignItems: 'center', gap: 17 },
  pad: { gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
  lift: {
    width: 48,
    minHeight: 49,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#396875',
    backgroundColor: '#14303C',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  liftText: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 8,
    letterSpacing: 1,
  },
  key: {
    width: 64,
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#172334',
    borderRadius: 15,
    borderColor: '#304057',
    borderWidth: 1,
  },
  center: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  line: { width: 27, height: 1, backgroundColor: colors.border },
  hint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11 },
});
