import { Redirect, useLocalSearchParams } from 'expo-router';
import GameScreen from '@/features/game/GameScreen';
import { getLevel } from '@/features/game/levels';
import { isUnlocked, useAppSelector } from '@/store';
import { useCommunity } from '@/features/community/CommunityProvider';
import { LoadingScreen } from '@/components/LoadingScreen';
export default function PlayRoute() {
  const { ready, session } = useCommunity();
  const { id, view } = useLocalSearchParams<{ id: string; view?: string }>();
  const results = useAppSelector((state) => state.progress.results);
  const level = getLevel(Number(id));
  if (!ready) return <LoadingScreen message="Switching pilot…" />;
  if (!level || !isUnlocked(level.id, results))
    return <Redirect href="/levels" />;
  return (
    <GameScreen
      key={`${level.id}:${session?.user.id ?? 'guest'}`}
      level={level}
      initialFullscreen={
        view === 'full' ? true : view === 'standard' ? false : undefined
      }
    />
  );
}
