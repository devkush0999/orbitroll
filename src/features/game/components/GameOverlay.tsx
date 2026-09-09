import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import LottieView from '@/components/Lottie';
import { Button, Label } from '@/components/ui';
import { RewardStars } from './RewardStars';
import { colors, fonts } from '@/theme/tokens';
import type { GameStatus, Level } from '../types';
import celebration from '../../../../assets/animations/celebration.json';
import { useCommunity } from '@/features/community/CommunityProvider';
import { sharePlayerLink } from '@/features/community/share';
import { useTask, Notice } from '@/features/community/components';
import { useState } from 'react';
type Props = {
  status: GameStatus;
  moves: number;
  seconds: number;
  stars: number;
  reducedMotion: boolean;
  level: Level;
  nextLevel?: Level;
  totalLevels: number;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  onNext: () => void;
};
export function GameOverlay(props: Props) {
  const { profile, session, notice } = useCommunity();
  const task = useTask();
  const [shareNotice, setShareNotice] = useState('');
  const won = props.status === 'won',
    paused = props.status === 'paused';
  return (
    <Modal
      visible={props.status !== 'playing'}
      transparent
      animationType={props.reducedMotion ? 'none' : 'fade'}
      onRequestClose={paused ? props.onResume : props.onExit}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        <ScrollView contentContainerStyle={s.scroll} bounces={false}>
          <View style={s.card} accessibilityViewIsModal>
            <View style={[s.art, won && { height: 80 }]}>
              {won && !props.reducedMotion ? (
                <LottieView
                  source={celebration}
                  autoPlay
                  loop={false}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View
                style={[
                  s.icon,
                  won && { width: 64, height: 64, borderRadius: 32 },
                ]}
              >
                <Ionicons
                  name={
                    won ? 'planet-outline' : paused ? 'pause' : 'cube-outline'
                  }
                  size={won ? 32 : 42}
                  color={colors.accent}
                />
              </View>
            </View>
            <Label color={colors.accent}>
              {won
                ? `LEVEL ${String(props.level.id).padStart(2, '0')} COMPLETE`
                : paused
                  ? props.level.name.toUpperCase()
                  : 'OFF THE EDGE'}
            </Label>
            <Text style={s.title}>
              {won
                ? props.stars === 3
                  ? 'Clean run.'
                  : 'Made it.'
                : paused
                  ? 'Take your time.'
                  : 'Try that turn again.'}
            </Text>
            <Text style={s.body}>
              {won
                ? !props.nextLevel
                  ? 'That was the last trail. Fancy another run?'
                  : props.stars === 3
                    ? 'All three crystals. Nicely done.'
                    : 'The portal is reached. You can come back for more stars.'
                : paused
                  ? 'We’ll keep your place.'
                  : 'There was no platform underneath. Follow the bright tile on your next try.'}
            </Text>
            {won && (
              <>
                <RewardStars
                  count={props.stars}
                  reducedMotion={props.reducedMotion}
                />
                <Text style={s.body}>
                  {props.level.name} · Trail {props.level.id} of{' '}
                  {props.totalLevels}
                </Text>
                <View style={s.stats}>
                  <Text style={s.stat}>{props.moves} rolls</Text>
                  <View style={s.divider} />
                  <Text style={s.stat}>
                    {Math.floor(props.seconds / 60)}:
                    {String(props.seconds % 60).padStart(2, '0')}
                  </Text>
                </View>
              </>
            )}
            {won && props.nextLevel && (
              <View style={s.nextCard}>
                <Label color={colors.cyan}>
                  UP NEXT · LEVEL {String(props.nextLevel.id).padStart(2, '0')}
                </Label>
                <Text style={s.nextTitle}>{props.nextLevel.name}</Text>
                <Text style={s.body}>{props.nextLevel.description}</Text>
              </View>
            )}
            {won && props.level.id > 0 && (
              <>
                <Text accessibilityLiveRegion="polite" style={s.body}>
                  {session
                    ? notice || 'Ranked runs sync from your pilot profile.'
                    : 'Saved on this device. Sign in before your next run to join the rankings.'}
                </Text>
                <Notice message={shareNotice} />
                <Notice message={task.error} error />
              </>
            )}
            <View style={{ alignSelf: 'stretch', gap: 12, marginTop: 8 }}>
              <Button
                title={
                  won
                    ? props.nextLevel
                      ? `Play level ${String(props.nextLevel.id).padStart(2, '0')}`
                      : 'Explore all levels'
                    : paused
                      ? 'Keep rolling'
                      : 'Try again'
                }
                onPress={
                  won ? props.onNext : paused ? props.onResume : props.onRestart
                }
                icon={paused ? 'play' : won ? 'arrow-forward' : 'refresh'}
              />
              {won && (
                <Button
                  title="Replay this trail"
                  onPress={props.onRestart}
                  secondary
                  icon="refresh"
                />
              )}
              {won && profile?.is_public && props.level.id > 0 && (
                <Button
                  title="Share my player card"
                  icon="share-outline"
                  secondary
                  disabled={task.busy}
                  onPress={() =>
                    void task.run(async () =>
                      setShareNotice(
                        await sharePlayerLink(
                          `I finished ${props.level.name} with ${props.stars} stars on Orbit Roll.`,
                          `/player/${profile.username}`,
                        ),
                      ),
                    )
                  }
                />
              )}
              {paused && (
                <Button
                  title="Restart level"
                  onPress={props.onRestart}
                  secondary
                  icon="refresh"
                />
              )}
              <Button
                title="Choose a trail"
                secondary
                icon="grid-outline"
                onPress={props.onExit}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  nextCard: {
    alignSelf: 'stretch',
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#365565',
    gap: 8,
  },
  nextTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  backdrop: { flex: 1, backgroundColor: '#040812E8', justifyContent: 'center' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 410,
    padding: 26,
    borderRadius: 30,
    backgroundColor: '#111C2B',
    borderColor: '#34443D',
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
  },
  art: {
    width: 230,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 92,
    height: 92,
    backgroundColor: '#243A2D',
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#4B6440',
    borderWidth: 1,
  },
  title: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: -0.9,
  },
  body: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 25 },
  stat: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  divider: { width: 1, height: 18, backgroundColor: colors.border },
});
