import { router } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
export default function NotFound() {
  return (
    <Screen style={{ paddingTop: 100 }}>
      <Text
        style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 32 }}
      >
        A little off course.
      </Text>
      <Button title="Back to base" onPress={() => router.replace('/')} />
    </Screen>
  );
}
