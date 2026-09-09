import { Platform, Share } from 'react-native';
import { publicUrl } from './validation';
export function shareAddress(path: string) {
  const origin =
    process.env.EXPO_PUBLIC_SITE_URL ||
    (Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : undefined);
  return publicUrl(origin, path);
}
export async function sharePlayerLink(
  title: string,
  path: string,
): Promise<string> {
  const url = shareAddress(path);
  if (Platform.OS === 'web') {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
        return '';
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return 'Link copied. Send it to your crew.';
      }
      return url;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return '';
      return url;
    }
  }
  await Share.share(
    Platform.OS === 'ios'
      ? { title, message: title, url }
      : { title, message: `${title}\n${url}` },
  );
  return '';
}
