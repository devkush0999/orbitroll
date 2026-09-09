import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { BoardProps } from './GameBoardCore';
export default function GameBoard(props: BoardProps) {
  return (
    <WithSkiaWeb
      getComponent={() => import('./GameBoardCore')}
      componentProps={props}
      opts={{ locateFile: () => '/canvaskit.wasm' }}
      fallback={<LoadingScreen compact message="Building your trail…" />}
    />
  );
}
