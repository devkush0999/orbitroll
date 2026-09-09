import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { signParameters, validateResource, type Kind } from './policy.ts';

const required = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error('Media service is not configured.');
  return value;
};
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
Deno.serve(async (request) => {
  const origin = request.headers.get('origin') ?? '';
  const allowed = (Deno.env.get('ADMIN_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const headers = {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : 'null',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });
  if (!origin || !allowed.includes(origin))
    return respond({ error: 'This admin origin is not allowed.' }, 403);
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers });
  if (request.method !== 'POST')
    return respond({ error: 'Method not allowed' }, 405);
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer '))
      throw new HttpError(401, 'Sign in to the admin panel.');
    const client = createClient(
      required('SUPABASE_URL'),
      required('SUPABASE_ANON_KEY'),
      {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser(authorization.slice(7));
    if (authError || !user)
      throw new HttpError(401, 'Your session expired. Sign in again.');
    const { data: admin, error: roleError } = await client.rpc('is_admin');
    if (roleError || admin !== true)
      throw new HttpError(403, 'Admin access required.');
    const body = await request.text();
    if (body.length > 2048) throw new HttpError(413, 'Request is too large.');
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(body);
      if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new Error();
    } catch {
      throw new HttpError(400, 'Invalid request.');
    }
    const cloud = required('CLOUDINARY_CLOUD_NAME');
    if (!/^[a-zA-Z0-9_-]+$/.test(cloud))
      throw new Error('Media service is not configured.');
    const apiKey = required('CLOUDINARY_API_KEY'),
      secret = required('CLOUDINARY_API_SECRET');
    if (data.action === 'sign') {
      if (
        !['image', 'video'].includes(String(data.kind)) ||
        typeof data.title !== 'string' ||
        !data.title.trim() ||
        data.title.trim().length > 80
      )
        throw new HttpError(400, 'Enter a title and choose an image or video.');
      const kind = data.kind as Kind;
      const preset = required(
        kind === 'image'
          ? 'CLOUDINARY_IMAGE_PRESET'
          : 'CLOUDINARY_VIDEO_PRESET',
      );
      const { data: ticket, error } = await client.rpc('admin_reserve_media', {
        p_kind: kind,
        p_title: data.title.trim(),
      });
      if (error)
        throw new HttpError(
          429,
          error.code === 'P0001'
            ? error.message
            : 'Upload reservation is unavailable. Check migrations.',
        );
      const parameters = {
        timestamp: String(Math.floor(Date.now() / 1000)),
        public_id: ticket.public_id,
        upload_preset: preset,
        overwrite: 'false',
        type: 'upload',
      };
      return respond({
        ticketId: ticket.id,
        endpoint: `https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`,
        parameters: {
          ...parameters,
          api_key: apiKey,
          signature: await signParameters(parameters, secret),
        },
      });
    }
    if (data.action === 'finalize') {
      if (
        typeof data.ticketId !== 'string' ||
        !/^[a-f0-9-]{36}$/.test(data.ticketId)
      )
        throw new HttpError(400, 'Invalid upload ticket.');
      const { data: ticket, error } = await client.rpc('admin_media_ticket', {
        p_id: data.ticketId,
      });
      if (error || !ticket)
        throw new HttpError(404, 'Upload ticket expired or unavailable.');
      if (ticket.complete === true) return respond({ id: ticket.id, status: 'registered' });
      // Never trust URL, size, format, duration, or uploader metadata from the browser.
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud}/resources/${ticket.kind}/upload/${encodeURIComponent(ticket.public_id)}`,
        {
          headers: { Authorization: `Basic ${btoa(`${apiKey}:${secret}`)}` },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok)
        throw new HttpError(
          409,
          'Cloudinary has not confirmed this upload. Retry verification shortly.',
        );
      const resource = validateResource(
        await response.json(),
        ticket.kind,
        ticket.public_id,
        cloud,
      );
      const service = createClient(
        required('SUPABASE_URL'),
        required('SUPABASE_SERVICE_ROLE_KEY'),
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { error: saveError } = await service.rpc('service_finalize_media', {
        p_id: ticket.id,
        p_actor: user.id,
        p_url: resource.url,
        p_bytes: resource.bytes,
        p_width: resource.width,
        p_height: resource.height,
        p_duration: resource.duration,
        p_format: resource.format,
      });
      if (saveError)
        throw new HttpError(
          409,
          'Could not register the verified media. Retry verification.',
        );
      return respond({ id: ticket.id, status: 'draft' });
    }
    throw new HttpError(400, 'Unknown action.');
  } catch (error) {
    if (error instanceof HttpError)
      return respond({ error: error.message }, error.status);
    return respond(
      {
        error:
          'Media verification failed. Check configuration, file limits, and Cloudinary availability.',
      },
      503,
    );
  }
});
