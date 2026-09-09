import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ComponentProps, PropsWithChildren } from 'react';
import { colors, fonts } from '@/theme/tokens';

export function Label({
  children,
  color = colors.muted,
}: PropsWithChildren<{ color?: string }>) {
  return <Text style={[styles.label, { color }]}>{children}</Text>;
}
export function IconButton({
  name,
  onPress,
  label,
  style,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        style,
        pressed && { opacity: 0.6 },
      ]}
    >
      <Ionicons name={name} size={21} color={colors.text} />
    </Pressable>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  icon = 'arrow-forward',
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        {
          opacity: disabled ? 0.4 : pressed ? 0.9 : 1,
          transform: [{ translateY: pressed && !disabled ? 2 : 0 }],
        },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: colors.text }]}>
        {title}
      </Text>
      <Ionicons
        name={icon}
        size={20}
        color={secondary ? colors.text : colors.background}
      />
    </Pressable>
  );
}
export function Stars({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`${count} of 3 stars`}
      style={{ flexDirection: 'row', gap: 5 }}
    >
      {[1, 2, 3].map((n) => (
        <Ionicons
          key={n}
          name={n <= count ? 'star' : 'star-outline'}
          size={size}
          color={n <= count ? colors.accent : '#536077'}
        />
      ))}
    </View>
  );
}
export const styles = StyleSheet.create({
  label: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 2.5 },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#111C2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: 58,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  secondary: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.background,
  },
});
