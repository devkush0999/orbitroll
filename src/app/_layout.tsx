import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Pressable, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk/400Regular';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { loadProgress, store } from '@/store';
import { colors } from '@/theme/tokens';
import { CommunityProvider } from '@/features/community/CommunityProvider';
void SplashScreen.preventAutoHideAsync().catch(() => {});

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: 32,
        justifyContent: 'center',
        gap: 20,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}
      >
        A small detour.
      </Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>
        Something interrupted your journey. Try loading this screen again.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={{
          padding: 20,
          backgroundColor: colors.accent,
          borderRadius: 16,
        }}
      >
        <Text style={{ color: colors.background, fontWeight: '700' }}>
          Try again
        </Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
    void loadProgress().then(() => setReady(true));
  }, []);
  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaProvider>
        <Provider store={store}>
          <StatusBar style="light" />
          {!ready || (!fontsLoaded && !fontError) ? (
            <LoadingScreen
              message={
                !ready ? 'Restoring your journey…' : 'Preparing your universe…'
              }
            />
          ) : (
            <CommunityProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                  animation: 'fade',
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="levels" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="how-to-play" />
                <Stack.Screen
                  name="play/[id]"
                  options={{ gestureEnabled: false }}
                />
              </Stack>
            </CommunityProvider>
          )}
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
