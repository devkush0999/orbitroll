import { useCallback, useEffect, useState } from 'react';
import { AppState, Image, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Button } from '@/components/ui';
import { requireSupabase } from '@/lib/supabase';
import {
  imageDeliveryUrl,
  isCloudinaryUrl,
  type MediaAsset,
} from '../../../shared/media';
import {
  c,
  CommunityScreen,
  OnlineGate,
  ResourceStatus,
  unwrap,
  useResource,
} from './components';

function Clip({ asset }: { asset: MediaAsset }) {
  const player = useVideoPlayer(asset.secure_url, (instance) => {
    instance.loop = false;
    instance.play();
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') player.pause();
    });
    return () => subscription.remove();
  }, [player]);
  useFocusEffect(useCallback(() => () => player.pause(), [player]));
  return (
    <VideoView
      player={player}
      nativeControls
      style={{ width: '100%', height: 230 }}
      accessibilityLabel={asset.title}
    />
  );
}
function Gallery() {
  const [page, setPage] = useState(0),
    [playing, setPlaying] = useState<string | null>(null);
  const data = useResource(
    String(page),
    useCallback(
      () =>
        unwrap(
          requireSupabase()
            .from('media_assets')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false })
            .order('id')
            .range(page * 12, page * 12 + 11),
        ),
      [page],
    ),
  );
  return (
    <>
      <ResourceStatus {...data} />
      {data.data?.length === 0 && (
        <Text style={c.body}>
          Nothing published yet. Check back for artwork and short clips from the
          crew.
        </Text>
      )}
      {data.data?.map((asset) => {
        const url = imageDeliveryUrl(asset);
        if (!url || !isCloudinaryUrl(url)) return null;
        return (
          <View key={asset.id} style={c.card}>
            <Text style={c.heading}>{asset.title}</Text>
            {asset.kind === 'image' ? (
              <Image
                source={{ uri: url }}
                accessibilityLabel={asset.title}
                style={{ width: '100%', height: 230 }}
                resizeMode="contain"
              />
            ) : playing === asset.id ? (
              <>
                <Clip asset={asset} />
                <Button
                  title="Close video"
                  secondary
                  onPress={() => setPlaying(null)}
                />
              </>
            ) : (
              <>
                <Text style={c.body}>
                  Short video · {Math.round(asset.duration ?? 0)} seconds ·{' '}
                  {(asset.bytes / 1048576).toFixed(1)} MB original. Plays only
                  when you choose.
                </Text>
                <Button
                  title="Play video"
                  icon="play"
                  onPress={() => setPlaying(asset.id)}
                />
              </>
            )}
          </View>
        );
      })}
      {data.data && (
        <>
          <View style={c.row}>
            <Button
              title="Previous"
              secondary
              disabled={!page}
              onPress={() => {
                setPlaying(null);
                setPage((value) => value - 1);
              }}
            />
            <Button
              title="Next"
              secondary
              disabled={data.data.length < 12 || page >= 100}
              onPress={() => {
                setPlaying(null);
                setPage((value) => value + 1);
              }}
            />
          </View>
          <Button
            title="Refresh gallery"
            icon="refresh"
            secondary
            onPress={data.reload}
          />
        </>
      )}
    </>
  );
}
export default function MediaScreen() {
  return (
    <CommunityScreen
      title="From the crew."
      subtitle="Artwork and short clips from Orbit Roll. Videos never start on their own."
    >
      <OnlineGate>
        <Gallery />
      </OnlineGate>
    </CommunityScreen>
  );
}
