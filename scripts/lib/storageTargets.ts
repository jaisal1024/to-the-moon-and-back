/**
 * Refuses migration runs whose database and Blob store do not belong together, so
 * media rows never point at files that live somewhere else. Each Vercel environment
 * pairs one Neon branch with its own Blob store; locally both are Docker containers.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const isLocalUrl = (value: string | undefined) => {
  if (!value) return false;
  try {
    return LOCAL_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
};

type Env = Record<string, string | undefined>;

export function checkStorageTargets(env: Env): void {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
  const localDb = isLocalUrl(env.DATABASE_URL);
  const token = env.BLOB_READ_WRITE_TOKEN ?? '';
  const emulatorBlob =
    token.startsWith('vercel_blob_rw_emulator_') ||
    isLocalUrl(env.VERCEL_BLOB_API_URL) ||
    isLocalUrl(env.STORAGE_VERCEL_BLOB_BASE_URL);

  if (!localDb && !token) {
    throw new Error('Remote DATABASE_URL but no BLOB_READ_WRITE_TOKEN: files would be written to local disk only.');
  }
  if (!localDb && emulatorBlob) {
    throw new Error(
      'Remote DATABASE_URL with the local Blob emulator configured. Unset VERCEL_BLOB_API_URL, ' +
        'NEXT_PUBLIC_VERCEL_BLOB_API_URL, and STORAGE_VERCEL_BLOB_BASE_URL, and use the Blob token for the same environment.',
    );
  }
  if (localDb && token && !emulatorBlob) {
    throw new Error('Local DATABASE_URL with a real Vercel Blob token: use the emulator settings from .env.example.');
  }
}
