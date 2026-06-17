import { Redis } from '@upstash/redis';

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const isConfigured = Boolean(
  UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN,
);

if (!isConfigured) {
  console.warn(
    '[redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set — token blocklist is disabled (logout still works, but revoked tokens are not blocked until expiry).',
  );
}

// Only construct the client when configured; the SDK warns and is unusable
// without credentials.
export const redis = isConfigured
  ? new Redis({
      url: UPSTASH_REDIS_REST_URL as string,
      token: UPSTASH_REDIS_REST_TOKEN as string,
    })
  : null;

const BLOCKLIST_PREFIX = 'blocklist:';

/**
 * Add a token's jti to the revocation blocklist with a TTL matching the
 * token's remaining lifetime, so the key self-expires. No-op when Redis is
 * not configured.
 */
export async function blocklistAdd(
  jti: string,
  ttlSeconds: number,
): Promise<void> {
  if (!redis || ttlSeconds <= 0) return;
  await redis.set(`${BLOCKLIST_PREFIX}${jti}`, '1', { ex: ttlSeconds });
}

/**
 * Check whether a token's jti has been revoked. Returns false when Redis is
 * not configured.
 */
export async function blocklistHas(jti: string): Promise<boolean> {
  if (!redis) return false;
  const value = await redis.get(`${BLOCKLIST_PREFIX}${jti}`);
  return value !== null;
}
