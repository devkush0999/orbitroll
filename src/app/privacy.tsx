import { Text, View } from 'react-native';
import { c, CommunityScreen } from '@/features/community/components';

export default function PrivacyScreen() {
  return (
    <CommunityScreen
      title="Your journey. Your choice."
      subtitle="How this version of Orbit Roll handles player data."
    >
      {[
        [
          'Playing locally',
          'Preferences, tutorial completion, and local game records are stored on your device. Guest play does not require an account. Device and browser backups are managed by your operating system.',
        ],
        [
          'Signing in',
          'Supabase stores your email for sign-in, an account identifier, display name, and username. Native sessions use secure device storage; website sessions use browser storage. Signing out returns to this device’s separate guest progress.',
        ],
        [
          'Ranked runs',
          'When signed in, completed game runs are queued on your device and sent to Supabase with their level version and move sequence. The server checks the sequence and calculates stars and points. Practice lessons and guest records are not uploaded. Verified results restore trail progress across devices; local completion times are not ranked.',
        ],
        [
          'Public profiles and invitations',
          'Profiles begin private. If you enable public rankings, everyone can see your name, username, points, stars, and completed trail count. Your email is never public. Anyone who has your invitation link can see your name and choose to connect. Both people can remove the connection. Turning off a public profile cannot remove copies others already shared.',
        ],
        [
          'Moderation',
          'Authorized administrators can review run records, hide runs, and exclude accounts from rankings and new connections. Actions and their reasons are recorded for review.',
        ],
        [
          'Optional media',
          'Published artwork and video clips are delivered by Cloudinary. Opening the media gallery requests images from its CDN; clips load when you choose to play. These requests disclose connection information such as your IP address to the media provider. Core gameplay assets remain bundled with the game.',
        ],
        [
          'Managing your data',
          'You can edit your profile, turn off public visibility, remove queued uploads, and disconnect from your crew in the app. Reset journey only clears local records; verified cloud records may return at the next sync. Contact the game operator for account and cloud-data deletion until self-service deletion is configured.',
        ],
      ].map(([title, body]) => (
        <View key={title} style={c.card}>
          <Text style={c.heading}>{title}</Text>
          <Text style={c.body}>{body}</Text>
        </View>
      ))}
    </CommunityScreen>
  );
}
