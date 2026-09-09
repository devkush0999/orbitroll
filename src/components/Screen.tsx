import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import type { PropsWithChildren } from 'react';
import { colors } from '@/theme/tokens';

export function Screen({
  children,
  scroll = true,
  style,
  immersive = false,
  scrollEnabled = true,
}: PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
  immersive?: boolean;
  scrollEnabled?: boolean;
}>) {
  return (
    <SafeAreaView
      style={s.safe}
      edges={immersive ? ['left', 'right'] : ['top', 'bottom', 'left', 'right']}
    >
      {scroll ? (
        <ScrollView
          scrollEnabled={scrollEnabled}
          contentContainerStyle={[s.content, style]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[s.content, { flex: 1 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 24,
    gap: 24,
  },
});
