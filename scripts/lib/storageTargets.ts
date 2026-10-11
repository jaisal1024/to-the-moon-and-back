/**
 * Refuses migration runs whose database and Blob store do not belong together, so
 * media rows never point at files that live somewhere else. Each Vercel environment
 * pairs one Neon branch with its own Blob store; locally both are Docker containers.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', 'host.docker.internal']);

const isLocalUrl = (value: string | undefined) => {
  if (!value) return false;
  try {
    // WHATWG URL keeps the brackets on IPv6 hosts ("[::1]").
    const host = new URL(value).hostname.replace(/^\[|\]$/g, '');
    // A name without a dot is a Docker or CI service name ("db", "postgres", "blob").
    return LOCAL_HOSTS.has(host) || host.endsWith('.localhost') || !host.includes('.');
  } catch {
    return false;
  }
};

type Env = Record<string, string | undefined>;

const EMULATOR_SETTINGS =
  'BLOB_READ_WRITE_TOKEN, VERCEL_BLOB_API_URL, NEXT_PUBLIC_VERCEL_BLOB_API_URL, and STORAGE_VERCEL_BLOB_BASE_URL';

export function checkStorageTargets(env: Env): void {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
  const localDb = isLocalUrl(env.DATABASE_URL);
  const token = env.BLOB_READ_WRITE_TOKEN ?? '';

  // Three settings decide where files go and what URLs get stored, and they must agree:
  // the token, the API the SDK uploads to (it reads either variable), and the URL prefix
  // Payload saves on each media row.
  const emulatorToken = token.startsWith('vercel_blob_rw_emulator_');
  const uploadsToEmulator = isLocalUrl(env.VERCEL_BLOB_API_URL || env.NEXT_PUBLIC_VERCEL_BLOB_API_URL);
  const urlsPointAtEmulator = isLocalUrl(env.STORAGE_VERCEL_BLOB_BASE_URL);
  const emulatorSignals = [emulatorToken, uploadsToEmulator, urlsPointAtEmulator];
  const anyEmulator = emulatorSignals.some(Boolean);
  const allEmulator = emulatorSignals.every(Boolean);

  if (!localDb && !token) {
    throw new Error('Remote DATABASE_URL but no BLOB_READ_WRITE_TOKEN: files would be written to local disk only.');
  }
  if (!localDb && anyEmulator) {
    throw new Error(
      'Remote DATABASE_URL with the local Blob emulator configured. Unset VERCEL_BLOB_API_URL, ' +
        'NEXT_PUBLIC_VERCEL_BLOB_API_URL, and STORAGE_VERCEL_BLOB_BASE_URL, and use the Blob token for the same environment.',
    );
  }
  if (localDb && token && !anyEmulator) {
    throw new Error('Local DATABASE_URL with a real Vercel Blob token: use the emulator settings from .env.example.');
  }
  if (anyEmulator && !allEmulator) {
    throw new Error(
      `Mixed Blob settings: some point at the local emulator and some at a real store, so uploads and the URLs saved ` +
        `for them would disagree. Set all of ${EMULATOR_SETTINGS} from .env.example, or none of the emulator ones.`,
    );
  }
}
