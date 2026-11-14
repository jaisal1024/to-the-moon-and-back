import { describe, expect, it } from 'vitest';

import { checkStorageTargets } from './storageTargets';

const neon = 'postgres://u:p@ep-cool-123.us-east-2.aws.neon.tech/neondb';
const local = 'postgres://postgres:postgres@localhost:54320/to_the_moon';
const emulator = {
  BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_emulator_localdevonly',
  VERCEL_BLOB_API_URL: 'http://localhost:3100/api/blob',
  NEXT_PUBLIC_VERCEL_BLOB_API_URL: 'http://localhost:3100/api/blob',
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

  it('refuses a remote database when only the public API URL still points at the emulator', () => {
    expect(() =>
      checkStorageTargets({
        DATABASE_URL: neon,
        ...realToken,
        NEXT_PUBLIC_VERCEL_BLOB_API_URL: 'http://localhost:3100/api/blob',
      }),
    ).toThrow(/emulator/);
  });

  it('refuses a local database when a real token would upload to the real store', () => {
    // A localhost file URL prefix alone does not redirect uploads: they would hit production.
    expect(() =>
      checkStorageTargets({ DATABASE_URL: local, ...realToken, STORAGE_VERCEL_BLOB_BASE_URL: 'http://localhost:3100' }),
    ).toThrow(/Mixed Blob settings/);
    expect(() =>
      checkStorageTargets({ DATABASE_URL: local, ...emulator, VERCEL_BLOB_API_URL: undefined }),
    ).not.toThrow();
    expect(() =>
      checkStorageTargets({
        DATABASE_URL: local,
        ...emulator,
        VERCEL_BLOB_API_URL: undefined,
        NEXT_PUBLIC_VERCEL_BLOB_API_URL: undefined,
      }),
    ).toThrow(/Mixed Blob settings/);
  });

  it('treats IPv6 loopback and Docker service names as local databases', () => {
    for (const host of ['[::1]:5432', 'db:5432', 'postgres:5432', 'host.docker.internal:5432', '0.0.0.0:5432']) {
      const DATABASE_URL = `postgres://postgres:postgres@${host}/to_the_moon`;
      expect(() => checkStorageTargets({ DATABASE_URL, ...emulator }), host).not.toThrow();
      expect(() => checkStorageTargets({ DATABASE_URL, ...realToken }), host).toThrow(/real Vercel Blob/);
    }
  });

  it('allows a local database with no Blob token (files go to ./media)', () => {
    expect(() => checkStorageTargets({ DATABASE_URL: local })).not.toThrow();
  });

  it('requires DATABASE_URL', () => {
    expect(() => checkStorageTargets({})).toThrow(/DATABASE_URL/);
  });
});
