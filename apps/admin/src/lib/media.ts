import { backend } from './supabase';
type Ticket = {
  ticketId: string;
  endpoint: string;
  parameters: Record<string, string>;
};
export async function mediaRequest<T>(
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await backend().functions.invoke<T>(
    'cloudinary-media',
    { body },
  );
  if (error) {
    let message =
      'Media service is unavailable. Check the Edge Function configuration.';
    if ('context' in error && error.context instanceof Response) {
      try {
        const response = await error.context.json();
        if (typeof response.error === 'string') message = response.error;
      } catch {}
    }
    throw new Error(message);
  }
  if (!data) throw new Error('Media service returned an empty response.');
  return data;
}
export const reserveUpload = (kind: 'image' | 'video', title: string) =>
  mediaRequest<Ticket>({ action: 'sign', kind, title });
export const finalizeUpload = (ticketId: string) =>
  mediaRequest<{ id: string; status: string }>({
    action: 'finalize',
    ticketId,
  });
export function uploadFile(
  ticket: Ticket,
  file: File,
  onProgress: (value: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const url = new URL(ticket.endpoint);
    if (url.protocol !== 'https:' || url.hostname !== 'api.cloudinary.com') {
      reject(new Error('Invalid media upload destination.'));
      return;
    }
    const form = new FormData();
    for (const [key, value] of Object.entries(ticket.parameters))
      form.append(key, value);
    form.append('file', file);
    const request = new XMLHttpRequest();
    request.open('POST', ticket.endpoint);
    request.timeout = 120000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () =>
      reject(
        new Error(
          'Upload interrupted. Retry verification before uploading again.',
        ),
      );
    request.ontimeout = () =>
      reject(
        new Error(
          'Upload timed out. Retry verification to check whether it arrived.',
        ),
      );
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(
            new Error(
              'Cloudinary rejected the file. Check the signed preset, format, and size limits.',
            ),
          );
    request.send(form);
  });
}
