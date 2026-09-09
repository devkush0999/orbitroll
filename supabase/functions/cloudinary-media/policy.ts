export type Kind = 'image' | 'video';
export function validateResource(
  value: Record<string, unknown>,
  kind: Kind,
  publicId: string,
  cloud: string,
) {
  const bytes = Number(value.bytes),
    width = Number(value.width),
    height = Number(value.height);
  const duration = kind === 'video' ? Number(value.duration) : null;
  const format = String(value.format);
  const url = new URL(String(value.secure_url));
  if (
    value.public_id !== publicId ||
    value.resource_type !== kind ||
    value.type !== 'upload' ||
    url.protocol !== 'https:' ||
    url.hostname !== 'res.cloudinary.com' ||
    !url.pathname.startsWith(`/${cloud}/${kind}/upload/`) ||
    !Number.isInteger(bytes) ||
    bytes < 1 ||
    bytes > (kind === 'image' ? 2097152 : 10485760) ||
    ![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 4096) ||
    !(kind === 'image' ? ['jpg', 'png', 'webp'] : ['mp4', 'webm']).includes(
      format,
    ) ||
    (kind === 'video' &&
      (!Number.isFinite(duration) || duration! <= 0 || duration! > 30))
  )
    throw new Error(
      'Media exceeds the upload policy. Remove the file in Cloudinary and use a smaller supported file.',
    );
  return { url: url.href, bytes, width, height, duration, format };
}
export async function signParameters(
  parameters: Record<string, string>,
  secret: string,
) {
  const content =
    Object.keys(parameters)
      .sort()
      .map((key) => `${key}=${parameters[key]}`)
      .join('&') + secret;
  const digest = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(content),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
