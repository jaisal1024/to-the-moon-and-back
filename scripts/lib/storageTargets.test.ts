import { describe, expect, it } from 'vitest';

import { checkStorageTargets } from './storageTargets';

const neon = 'postgres://u:p@ep-cool-123.us-east-2.aws.neon.tech/neondb';
const local = 'postgres://postgres:postgres@localhost:54320/to_the_moon';
const emulator = {
  BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_emulator_localdevonly',
  VERCEL_BLOB_API_URL: 'http://localhost:3100/api/blob',
  STORAGE_VERCEL_BLOB_BASE_URL: 'http://localhost:3100',
};
const realToken = { BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_abc123def_secret456' };

describe('checkStorageTargets', () => {
  it('allows the local database with the local emulator', () => {
    expect(() => checkStorageTargets({ DATABASE_URL: local, ...emulator })).not.toThrow();
  });

  it('allows a remote database with a real Blob token', () => {
    expect(() => checkStorageTargets({ DATABASE_URL: neon, ...realToken })).not.toThrow();
  });

  it('refuses a remote database with the emulator configured (copied local .env)', () => {
    expect(() => checkStorageTargets({ DATABASE_URL: neon, ...emulator })).toThrow(/emulator/);
    expect(() =>
      checkStorageTargets({ DATABASE_URL: neon, ...realToken, STORAGE_VERCEL_BLOB_BASE_URL: 'http://localhost:3100' }),
    ).toThrow(/emulator/);
  });

  it('refuses a remote database without a Blob token', () => {
    expect(() => checkStorageTargets({ DATABASE_URL: neon })).toThrow(/local disk/);
  });

  it('refuses a local database with a real Blob token', () => {
    expect(() => checkStorageTargets({ DATABASE_URL: local, ...realToken })).toThrow(/real Vercel Blob/);
  });

  it('requires DATABASE_URL', () => {
    expect(() => checkStorageTargets({})).toThrow(/DATABASE_URL/);
  });
});
