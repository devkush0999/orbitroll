import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/tokens';

/** No custom font or Skia dependency: this can render before those resources are ready. */
export function LoadingScreen({
  compact = false,
  message = 'Preparing your universe…',
}: {
  compact?: boolean;
  message?: string;
}) {
  return (
    <View
      style={[s.screen, compact && { minHeight: 120 }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      {!compact && (
        <>
          <View style={s.orbit}>
            <Image
              source={require('../../assets/icon.png')}
              style={s.icon}
              accessible={false}
            />
          </View>
          <Text style={s.title}>orbit / roll</Text>
          <Text style={s.subtitle}>FIND YOUR NEXT TURN.</Text>
        </>
      )}
      <View style={s.status}>
        <ActivityIndicator color={colors.accent} />
        <Text style={s.message}>{message}</Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    padding: 24,
  },
  orbit: {
    padding: 30,
    borderWidth: 1,
    borderColor: '#2C4147',
    borderRadius: 120,
    backgroundColor: '#101D29',
  },
  icon: { width: 110, height: 110, borderRadius: 30 },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  subtitle: { color: colors.muted, fontSize: 9, letterSpacing: 2 },
  status: { alignItems: 'center', gap: 15, marginTop: 18 },
  message: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
