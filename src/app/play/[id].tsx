import { Redirect, useLocalSearchParams } from 'expo-router';
import GameScreen from '@/features/game/GameScreen';
import { getLevel } from '@/features/game/levels';
import { isUnlocked, useAppSelector } from '@/store';
export default function PlayRoute() {
  const { id, view } = useLocalSearchParams<{ id: string; view?: string }>();
  const results = useAppSelector((state) => state.progress.results);
  const level = getLevel(Number(id));
  if (!level || !isUnlocked(level.id, results))
    return <Redirect href="/levels" />;
  return (
    <GameScreen
      key={level.id}
      level={level}
      initialFullscreen={
        view === 'full' ? true : view === 'standard' ? false : undefined
      }
    />
  );
}
