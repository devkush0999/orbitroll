import { Linking, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { c, CommunityScreen, Notice, useTask } from './components';
import { useCommunity } from './CommunityProvider';
export default function AdminScreen() {
  const { isAdmin } = useCommunity();
  const task = useTask();
  const url = process.env.EXPO_PUBLIC_ADMIN_URL?.trim();
  return (
    <CommunityScreen
      title="Mission control."
      subtitle="Administration now has its own Next.js web app."
    >
      <View style={c.card}>
        <Text style={c.heading}>
          {isAdmin ? 'Open your admin workspace' : 'For game administrators'}
        </Text>
        <Text style={c.body}>
          Player moderation and Cloudinary media publishing are managed in the
          separate web admin. Sign in there with your administrator account.
        </Text>
        <Notice message={task.error} error />
        {url ? (
          <Button
            title="Open web admin"
            icon="open-outline"
            disabled={task.busy}
            onPress={() =>
              void task.run(async () => {
                const parsed = new URL(url);
                if (
                  parsed.protocol !== 'https:' ||
                  parsed.username ||
                  parsed.password
                )
                  throw new Error('The admin address must use HTTPS.');
                await Linking.openURL(parsed.href);
              })
            }
          />
        ) : (
          <Text style={c.body}>
            The admin website address has not been configured for this build
            yet.
          </Text>
        )}
      </View>
    </CommunityScreen>
  );
}
