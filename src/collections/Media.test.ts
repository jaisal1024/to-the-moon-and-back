import type { PayloadRequest } from 'payload';
import { describe, expect, it } from 'vitest';

import { mediaReadAccess } from './Media';

const read = (req: Partial<PayloadRequest>, isReadingStaticFile = false) =>
  mediaReadAccess({ req: req as PayloadRequest, isReadingStaticFile });

describe('mediaReadAccess', () => {
  it('blocks anonymous REST and GraphQL listing', () => {
    expect(read({ payloadAPI: 'REST' })).toBe(false);
    expect(read({ payloadAPI: 'GraphQL' })).toBe(false);
  });

  it('serves files to anyone', () => {
    expect(read({ payloadAPI: 'REST' }, true)).toBe(true);
  });

  it('allows the site (Local API) and signed-in admins', () => {
    expect(read({ payloadAPI: 'local' })).toBe(true);
    expect(read({ payloadAPI: 'REST', user: { id: 1 } as PayloadRequest['user'] })).toBe(true);
  });
});
