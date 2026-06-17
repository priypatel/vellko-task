import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

if (!isConfigured) {
  console.warn(
    '[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set — storage operations will fail until configured.',
  );
}

/**
 * Service-role Supabase client. This key bypasses Row Level Security, so it
 * must only ever be used server-side and never exposed to clients.
 * Constructed only when configured; `createClient` throws on an empty URL.
 */
const client: SupabaseClient | null = isConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

function requireClient(): SupabaseClient {
  if (!client) {
    throw new Error('[supabase] storage is not configured');
  }
  return client;
}

export const supabase = client;

/**
 * Upload a file buffer to a Storage bucket. Overwrites any existing object at
 * the same path. Returns the stored object path.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await requireClient().storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) {
    throw new Error(`[supabase] upload failed: ${error.message}`);
  }

  return path;
}

/**
 * Generate a time-limited signed URL for a private object.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number,
): Promise<string> {
  const { data, error } = await requireClient().storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(
      `[supabase] signed URL failed: ${error?.message ?? 'unknown error'}`,
    );
  }

  return data.signedUrl;
}

/**
 * Download a private object as a Buffer.
 */
export async function downloadFile(
  bucket: string,
  path: string,
): Promise<Buffer> {
  const { data, error } = await requireClient().storage.from(bucket).download(path);

  if (error || !data) {
    throw new Error(
      `[supabase] download failed: ${error?.message ?? 'unknown error'}`,
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete an object from a bucket.
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await requireClient().storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`[supabase] delete failed: ${error.message}`);
  }
}
