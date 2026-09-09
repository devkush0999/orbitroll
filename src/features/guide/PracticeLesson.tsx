import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Button, Label } from '@/components/ui';
import { useAppSelector } from '@/store';
import { colors, fonts } from '@/theme/tokens';
import { useGame } from '../game/hooks/useGame';
import GameBoard from '../game/components/GameBoard';
import { Controls } from '../game/components/Controls';
import { swipeDirection, swipeThreshold } from '../game/input';
import type { Lesson } from './lessons';

export function PracticeLesson({
  lesson,
  onInteract,
}: {
  lesson: Lesson;
  onInteract: (active: boolean) => void;
}) {
  const game = useGame(lesson.level, { recordProgress: false });
  const { available, move } = game;
  const [width, setWidth] = useState(320);
  const sensitivity = useAppSelector((root) => root.progress.sensitivity);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(swipeThreshold[sensitivity])
        .maxPointers(1)
        .runOnJS(true)
        .onBegin(() => onInteract(true))
        .onEnd((event) => {
          const direction = swipeDirection(
            event.translationX,
            event.translationY,
            swipeThreshold[sensitivity],
            available,
          );
          if (direction) move(direction);
        })
        .onFinalize(() => onInteract(false)),
    [sensitivity, available, move, onInteract],
  );
  const won = game.state.status === 'won';
  const failed = game.state.status === 'falling';
  const paused = game.state.status === 'paused';
  return (
    <View style={s.practice}>
      <View style={s.top}>
        <Label color={colors.cyan}>TRY IT HERE</Label>
        <Text style={s.note}>Practice · No saved scores</Text>
      </View>
      <Text style={s.instruction}>{lesson.instruction}</Text>
      <GestureDetector gesture={pan}>
        <View
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          accessible
          accessibilityLabel={`${lesson.title} practice. ${game.state.moves} moves. Altitude ${game.state.position.y}.`}
          accessibilityHint="Swipe within this area, or use the labeled movement buttons below."
          style={s.board}
        >
          <GameBoard
            {...game}
            width={width}
            height={290}
            level={lesson.level}
          />
        </View>
      </GestureDetector>
      <View accessibilityLiveRegion="polite" style={s.feedback}>
        <Text
          style={[
            s.message,
            {
              color: won ? colors.accent : failed ? colors.danger : colors.text,
            },
          ]}
        >
          {won
            ? lesson.success
            : failed
              ? 'A little off course. Try again and follow the highlighted trail.'
              : paused
                ? 'Practice paused while you were away.'
                : game.motion === 'drop'
                  ? 'Landing on the deck below…'
                  : game.motion === 'lift'
                    ? 'Moving between cyan pads…'
                    : 'Your turn. Take it one move at a time.'}
        </Text>
      </View>
      {won || failed || paused ? (
        <Button
          title={paused ? 'Resume practice' : 'Try this lesson again'}
          icon={paused ? 'play' : 'refresh'}
          secondary
          onPress={paused ? game.resume : game.restart}
        />
      ) : (
        <Controls
          onMove={game.move}
          disabled={game.motion !== null}
          canRise={game.available.includes('up')}
          canDescend={game.available.includes('down')}
        />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  practice: {
    gap: 17,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#365265',
    borderRadius: 24,
    backgroundColor: '#0B1524',
    overflow: 'hidden',
  },
  top: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 18,
  },
  note: { fontFamily: fonts.medium, color: colors.muted, fontSize: 10 },
  instruction: {
    fontFamily: fonts.medium,
    color: '#CCDCEA',
    fontSize: 13,
    lineHeight: 21,
    paddingHorizontal: 18,
  },
  board: { height: 290 },
  feedback: { paddingHorizontal: 18, minHeight: 44, justifyContent: 'center' },
  message: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 21 },
});
