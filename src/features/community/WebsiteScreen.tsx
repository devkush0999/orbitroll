import { router } from 'expo-router';
import { Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/Screen';
import { Button, Label } from '@/components/ui';
import { TrailPreview } from '../game/components/TrailPreview';
import { levels } from '../game/levels';
import { colors } from '@/theme/tokens';
import { c } from './components';
import { useCommunity } from './CommunityProvider';

export default function WebsiteScreen() {
  const { width } = useWindowDimensions();
  const { session } = useCommunity();
  return (
    <Screen style={{ maxWidth: 1120, gap: 36, paddingTop: 30 }}>
      <View style={[c.row, { flexWrap: 'wrap' }]}>
        <View style={c.row}>
          <Ionicons name="cube-outline" size={28} color={colors.accent} />
          <Text style={c.heading}>orbit roll.</Text>
        </View>
        <Button
          secondary
          title={session ? 'Your pilot profile' : 'Join the crew'}
          icon="person-outline"
          onPress={() => router.push('/account')}
        />
      </View>
      <View
        style={{
          flexDirection: width > 800 ? 'row' : 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <View style={{ flex: 1, gap: 24, width: '100%' }}>
          <Label color={colors.accent}>
            A SMALL CUBE. A VERY BIG UNIVERSE.
          </Label>
          <Text
            accessibilityRole="header"
            style={[
              c.title,
              {
                fontSize: width > 800 ? 62 : 44,
                lineHeight: width > 800 ? 68 : 50,
              },
            ]}
          >
            Find your feet.{'\n'}Lose the gravity.
          </Text>
          <Text style={[c.body, { fontSize: 17, lineHeight: 28 }]}>
            Roll through winding trails, catch a falling path, and find your way
            home. Eighteen little adventures. One more reason to bring a friend.
          </Text>
          <Button
            title="Play in your browser"
            icon="play"
            onPress={() => router.push('/levels')}
          />
          <Button
            secondary
            title="Meet the pilots"
            icon="podium-outline"
            onPress={() => router.push('/leaderboard')}
          />
        </View>
        <View style={{ flex: 1, width: '100%', minWidth: 280 }}>
          <TrailPreview level={levels[6]!} height={380} />
          <Text style={[c.body, { textAlign: 'center' }]}>
            A real trail from the game. Mind the drop.
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: width > 800 ? 'row' : 'column', gap: 18 }}>
        {[
          [
            '01',
            'Take the scenic route.',
            'Rise on cyan lifts. Drop onto golden landings. Let the next piece of the path reveal itself.',
          ],
          [
            '02',
            'Make each move count.',
            'Collect three crystals, finish a trail, and improve your best verified score.',
          ],
          [
            '03',
            'Leave room for friends.',
            'Share a player card or an invitation. Build your crew and follow each other’s progress.',
          ],
        ].map(([number, title, body]) => (
          <View key={number} style={[c.card, { flex: 1 }]}>
            <Label color={colors.cyan}>{number}</Label>
            <Text style={c.heading}>{title}</Text>
            <Text style={c.body}>{body}</Text>
          </View>
        ))}
      </View>
      <View style={c.card}>
        <Text style={c.heading}>First time outside the atmosphere?</Text>
        <Text style={c.body}>
          A few short practice trails teach you to roll, lift, and land. No
          score to chase. Just find your rhythm.
        </Text>
        <Button
          secondary
          title="Learn how to play"
          icon="book-outline"
          onPress={() => router.push('/how-to-play')}
        />
      </View>
      <View style={[c.row, { flexWrap: 'wrap' }]}>
        <Text style={c.body}>Orbit Roll · Made for a moment of wonder.</Text>
        <Button
          title="Privacy & data"
          secondary
          icon="shield-checkmark-outline"
          onPress={() => router.push('/privacy')}
        />
      </View>
    </Screen>
  );
}
