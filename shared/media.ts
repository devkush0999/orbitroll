export type MediaAsset = {
  id: string;
  public_id: string;
  kind: 'image' | 'video';
  title: string;
  secure_url: string;
  bytes: number;
  width: number;
  height: number;
  duration: number | null;
  format: string;
  published: boolean;
  created_at: string;
};
export const MEDIA_LIMITS = {
  image: 2 * 1024 * 1024,
  video: 10 * 1024 * 1024,
  seconds: 30,
} as const;
export function isCloudinaryUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export function imageDeliveryUrl(
  asset: Pick<MediaAsset, 'secure_url' | 'kind'>,
  size: 320 | 640 = 640,
) {
  if (!isCloudinaryUrl(asset.secure_url)) return null;
  if (asset.kind !== 'image') return asset.secure_url;
  return asset.secure_url.replace(
    '/image/upload/',
    `/image/upload/f_auto,q_auto,c_limit,w_${size}/`,
  );
}
