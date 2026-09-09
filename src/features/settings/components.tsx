import type { ComponentProps, PropsWithChildren } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

export function SettingsSection({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}
export function SettingRow({
  title,
  detail,
  icon,
  value,
  onChange,
  onPress,
  disabled = false,
  danger = false,
}: {
  title: string;
  detail: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  value?: boolean;
  onChange?: (value: boolean) => void;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const content = (
    <>
      <View style={styles.icon}>
        <Ionicons
          name={icon}
          size={21}
          color={danger ? colors.danger : colors.cyan}
        />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={[styles.title, danger && { color: colors.danger }]}>
          {title}
        </Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      {onChange ? (
        <Switch
          accessibilityLabel={title}
          accessibilityHint={detail}
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ true: '#668C4B', false: colors.border }}
          thumbColor={colors.text}
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      ) : null}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.65 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={[styles.row, disabled && { opacity: 0.55 }]}>{content}</View>
  );
}
export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityLabel={`${label}: ${option.label}`}
          accessibilityState={{ checked: value === option.value }}
          onPress={() => onChange(option.value)}
          style={[styles.choice, value === option.value && styles.selected]}
        >
          <Text
            style={[
              styles.choiceText,
              value === option.value && { color: colors.accent },
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  section: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 2.3,
    marginLeft: 4,
  },
  group: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: 13,
    padding: 18,
    alignItems: 'center',
    minHeight: 84,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1B2B3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
  detail: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  choice: {
    flexGrow: 1,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#0C1422',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  selected: { borderColor: '#6B8C56', backgroundColor: '#23372A' },
  choiceText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
