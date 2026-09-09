import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  AccessibilityInfo,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '@/store';
import { swipeDirection, swipeThreshold } from './input';
import { useFullscreen } from './hooks/useFullscreen';
import { Screen } from '@/components/Screen';
import { IconButton, Label } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { directionBetween, getStars, sameCell } from './engine';
import { getNextLevel, levels } from './levels';
import type { Direction, Level } from './types';
import { useGame } from './hooks/useGame';
import GameBoard from './components/GameBoard';
import { Controls } from './components/Controls';
import { GameOverlay } from './components/GameOverlay';

export default function GameScreen({
  level,
  initialFullscreen,
}: {
  level: Level;
  initialFullscreen?: boolean;
}) {
  const game = useGame(level);
  const { state, move, pause } = game;
  const preferences = useAppSelector((root) => root.progress);
  const { fullscreen, toggleFullscreen } = useFullscreen(
    initialFullscreen ?? preferences.fullscreen,
  );
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  const compact = windowSize.height < 700;
  const [footerHeight, setFooterHeight] = useState(100);
  const [screenReader, setScreenReader] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(
    preferences.controlMode === 'buttons' &&
      !(initialFullscreen ?? preferences.fullscreen),
  );
  const showControls = screenReader || controlsVisible;
  const sceneTop = fullscreen ? insets.top + 104 : 0;
  const sceneBottom = fullscreen
    ? footerHeight + Math.max(insets.bottom, 14) + 12
    : 0;
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (active) setScreenReader(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReader,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  const toggleView = () => {
    toggleFullscreen();
    setControlsVisible(fullscreen && preferences.controlMode === 'buttons');
  };
  const [size, setSize] = useState({ width: 340, height: 350 });
  const percent = Math.round((state.furthest / (level.path.length - 1)) * 100);
  const trailDirections = game.available.join(', ');
  const tileNumber =
    level.path.findIndex((cell) => sameCell(cell, state.position)) + 1;
  const nextTile = level.path[tileNumber];
  const nextDirection =
    nextTile && tileNumber > 0
      ? directionBetween(state.position, nextTile)
      : undefined;
  const directionCue: Record<Direction, string> = {
    north: '↗ Roll north',
    west: '↖ Roll west',
    south: '↙ Roll south',
    east: '↘ Roll east',
    up: '↑ Lift up',
    down: '↓ Lift down',
  };
  const nextLevel = getNextLevel(level.id);
  const leaving = useRef(false);
  const playNext = () => {
    if (leaving.current || state.status !== 'won') return;
    leaving.current = true;
    if (!nextLevel) router.replace('/levels');
    else
      router.replace({
        pathname: '/play/[id]',
        params: { id: nextLevel.id, view: fullscreen ? 'full' : 'standard' },
      });
  };
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!screenReader)
        .minDistance(swipeThreshold[preferences.sensitivity])
        .maxPointers(1)
        .runOnJS(true)
        .onEnd((event) => {
          const direction = swipeDirection(
            event.translationX,
            event.translationY,
            swipeThreshold[preferences.sensitivity],
            game.available,
          );
          if (direction) move(direction);
        }),
    [move, preferences.sensitivity, game.available, screenReader],
  );
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        pause();
        return true;
      },
    );
    return () => subscription.remove();
  }, [pause]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      const keys: Record<string, Direction> = {
        ArrowUp: 'north',
        ArrowRight: 'east',
        ArrowDown: 'south',
        ArrowLeft: 'west',
        w: 'north',
        d: 'east',
        s: 'south',
        a: 'west',
        q: 'up',
        e: 'down',
        PageUp: 'up',
        PageDown: 'down',
      };
      if (keys[event.key]) {
        event.preventDefault();
        if (!event.repeat) move(keys[event.key]!);
      } else if (event.key === 'Escape') pause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, pause]);
  return (
    <Screen
      scroll={false}
      immersive={fullscreen}
      style={
        fullscreen
          ? { padding: 0, paddingBottom: 0, gap: 0, maxWidth: undefined }
          : {
              gap: compact ? 8 : 14,
              paddingTop: compact ? 12 : 24,
              paddingBottom: 12,
            }
      }
    >
      <StatusBar
        style="light"
        hidden={fullscreen && state.status === 'playing'}
      />
      {Platform.OS === 'android' && (
        <NavigationBar
          style="light"
          hidden={fullscreen && state.status === 'playing'}
        />
      )}
      <View
        style={[
          s.header,
          fullscreen && {
            position: 'absolute',
            top: insets.top + 12,
            left: 20,
            right: 20,
            zIndex: 2,
          },
        ]}
      >
        <IconButton
          name={fullscreen ? 'contract-outline' : 'expand-outline'}
          label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onPress={toggleView}
        />
        <View style={{ alignItems: 'center', gap: 7 }}>
          <Label>LEVEL {String(level.id).padStart(2, '0')}</Label>
          <Text style={s.levelName}>{level.name}</Text>
        </View>
        <IconButton name="pause" label="Pause game" onPress={pause} />
      </View>
      {!fullscreen && !compact && (
        <View style={s.metrics}>
          <Text style={s.metricText}>
            {percent}% <Text style={s.metricMuted}>there</Text>
          </Text>
          <View
            accessible
            accessibilityLabel={`${state.collected.length} of 3 crystals`}
            style={{ flexDirection: 'row', gap: 7 }}
          >
            {[0, 1, 2].map((index) => (
              <Ionicons
                key={index}
                name={
                  index < state.collected.length ? 'diamond' : 'diamond-outline'
                }
                size={17}
                color={
                  index < state.collected.length ? colors.accent : colors.muted
                }
              />
            ))}
          </View>
          <Text style={s.metricText}>
            {state.moves} <Text style={s.metricMuted}>rolls</Text>
          </Text>
        </View>
      )}
      {!fullscreen && (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Distance to portal"
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          style={s.track}
        >
          <View style={[s.progress, { width: `${percent}%` }]} />
        </View>
      )}
      <GestureDetector gesture={pan}>
        <View
          style={[s.board, fullscreen && { borderRadius: 0 }]}
          accessible
          accessibilityLabel={`Space trail. Cube at tile ${tileNumber} of ${level.path.length}. ${state.collected.length} crystals collected.`}
          accessibilityHint={`Connected trail directions: ${trailDirections || 'none'}. Swipe diagonally to roll. Swipe straight up or down on cyan pads to use lifts.`}
          accessibilityActions={(
            ['north', 'east', 'south', 'west', 'up', 'down'] as Direction[]
          ).map((name) => ({ name, label: `Move ${name}` }))}
          onAccessibilityAction={(event) => {
            const direction = event.nativeEvent.actionName as Direction;
            if (
              ['north', 'east', 'south', 'west', 'up', 'down'].includes(
                direction,
              )
            )
              move(direction);
          }}
          onLayout={(event) =>
            setSize({
              width: event.nativeEvent.layout.width,
              height: event.nativeEvent.layout.height,
            })
          }
        >
          <View style={{ marginTop: sceneTop }} pointerEvents="none">
            <GameBoard
              width={size.width}
              height={Math.max(100, size.height - sceneTop - sceneBottom)}
              level={level}
              state={state}
              theme={game.theme}
              reducedMotion={game.reducedMotion}
              progress={game.progress}
              fromX={game.fromX}
              fromZ={game.fromZ}
              dx={game.dx}
              dz={game.dz}
              fall={game.fall}
              elevation={game.elevation}
              groundY={game.groundY}
              sourceIndex={game.sourceIndex}
              targetIndex={game.targetIndex}
            />
          </View>
          <View
            pointerEvents="none"
            style={[
              s.boardTop,
              fullscreen && { top: insets.top + 82, left: 22, right: 22 },
            ]}
          >
            <Label color="#A4B9CC">
              HEIGHT {state.position.y > 0 ? '+' : ''}
              {state.position.y}
              {game.motion === 'drop'
                ? ' · DROPPING'
                : game.motion === 'lift'
                  ? ' · LIFTING'
                  : ''}
            </Label>
            <Text style={s.time}>
              {String(Math.floor(game.seconds / 60)).padStart(2, '0')}:
              {String(game.seconds % 60).padStart(2, '0')}
            </Text>
          </View>
        </View>
      </GestureDetector>
      <View
        onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        style={
          fullscreen
            ? [s.floatingControls, { bottom: Math.max(insets.bottom, 14) }]
            : { gap: 10 }
        }
      >
        <View style={s.quickControls}>
          <Text style={s.tipText}>
            {fullscreen || compact
              ? `${percent}% · ${state.collected.length}/3 crystals · ${state.moves} rolls`
              : showControls
                ? 'Tap a direction. Or swipe the trail.'
                : 'Swipe diagonally to roll.'}
          </Text>
          {!screenReader && (
            <IconButton
              name={
                showControls ? 'hand-left-outline' : 'game-controller-outline'
              }
              label={
                showControls ? 'Hide control buttons' : 'Show control buttons'
              }
              onPress={() => setControlsVisible(!showControls)}
            />
          )}
        </View>
        {preferences.showHints && !compact && (
          <View style={s.tip}>
            <Ionicons
              name="navigate-circle-outline"
              size={17}
              color={colors.accent}
            />
            <Text style={s.tipText}>
              {game.motion === 'drop'
                ? 'Hold on… landing on the path below.'
                : game.motion === 'lift'
                  ? 'Lift engaged. Moving to the next deck.'
                  : nextDirection
                    ? `${directionCue[nextDirection]}${nextTile!.y < state.position.y && nextDirection !== 'down' ? ' · Safe drop below' : ''}`
                    : 'Follow the trail into the glowing portal.'}
            </Text>
          </View>
        )}
        {showControls && (
          <Controls
            showHint={false}
            onMove={move}
            disabled={state.status !== 'playing' || game.motion !== null}
            canRise={game.available.includes('up')}
            canDescend={game.available.includes('down')}
          />
        )}
      </View>
      <GameOverlay
        status={state.status}
        moves={state.moves}
        seconds={game.seconds}
        reducedMotion={game.reducedMotion}
        stars={getStars(state.moves, state.collected.length, level)}
        level={level}
        nextLevel={nextLevel}
        totalLevels={levels.length}
        onResume={game.resume}
        onRestart={game.restart}
        onExit={() => router.replace('/levels')}
        onNext={playNext}
      />
    </Screen>
  );
}
const s = StyleSheet.create({
  floatingControls: {
    position: 'absolute',
    left: 20,
    right: 20,
    gap: 10,
    padding: 12,
    borderRadius: 22,
    backgroundColor: '#080D18D9',
  },
  quickControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelName: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  metricText: { fontFamily: fonts.medium, color: colors.text, fontSize: 14 },
  metricMuted: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12 },
  track: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: { height: 3, backgroundColor: colors.accent },
  board: { flex: 1, minHeight: 100, overflow: 'hidden', borderRadius: 20 },
  boardTop: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: '#65758F',
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 2,
  },
  tip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
  },
  tipText: { fontFamily: fonts.regular, color: colors.muted, fontSize: 10 },
});
