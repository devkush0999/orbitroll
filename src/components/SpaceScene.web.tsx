import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { ActivityIndicator, View } from 'react-native';
import type { SpaceSceneProps } from './SpaceSceneCore';
export default function SpaceScene(props: SpaceSceneProps) {
  return (
    <WithSkiaWeb
      getComponent={() => import('./SpaceSceneCore')}
      componentProps={props}
      opts={{ locateFile: () => '/canvaskit.wasm' }}
      fallback={
        <View style={{ height: props.height, justifyContent: 'center' }}>
          <ActivityIndicator color="#B9F78B" />
        </View>
      }
    />
  );
}
