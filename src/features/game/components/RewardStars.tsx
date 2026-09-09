import { useEffect } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme/tokens';

function RewardStar({
  earned,
  index,
  reducedMotion,
}: {
  earned: boolean;
  index: number;
  reducedMotion: boolean;
}) {
  const scale = useSharedValue(reducedMotion ? 1 : 0.65);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    scale.set(
      reducedMotion
        ? 1
        : withDelay(
            120 + index * 140,
            withSpring(1, { damping: 11, stiffness: 180 }),
          ),
    );
    opacity.set(
      reducedMotion
        ? 1
        : withDelay(120 + index * 140, withTiming(1, { duration: 200 })),
    );
  }, [index, reducedMotion, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={style}>
      <Ionicons
        name={earned ? 'star' : 'star-outline'}
        size={38}
        color={earned ? colors.accent : colors.muted}
      />
    </Animated.View>
  );
}
export function RewardStars({
  count,
  reducedMotion,
}: {
  count: number;
  reducedMotion: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${count} of 3 stars earned`}
      style={{ flexDirection: 'row', gap: 14, paddingVertical: 8 }}
    >
      {[0, 1, 2].map((index) => (
        <RewardStar
          key={index}
          index={index}
          earned={index < count}
          reducedMotion={reducedMotion}
        />
      ))}
    </View>
  );
}
