import { revalidatePath } from 'next/cache';
import type { PayloadRequest } from 'payload';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { revalidateAfterChange, revalidateAfterDelete } from './revalidate';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

type Doc = { id?: number; slug: string; _status?: 'draft' | 'published' };

const pathsFor = (doc: Doc) => ['/', `/things/${doc.slug}`];
const req = { payload: { logger: { info: vi.fn(), warn: vi.fn() } } } as unknown as PayloadRequest;

// The hooks only read these fields; cast past Payload's full hook argument types.

const call = (hook: any, args: Record<string, unknown>) => hook({ req, context: {}, ...args });
const revalidated = () => vi.mocked(revalidatePath).mock.calls.map(([path]) => path);

// Vitest 5 fails a test when a mock throws after mockReset(), even if the caller
// catches it, so clear call history and restore a no-op implementation instead.
const resetRevalidate = () => {
  vi.mocked(revalidatePath).mockClear();
  vi.mocked(revalidatePath).mockImplementation(() => undefined);
};

describe('revalidateAfterChange', () => {
  beforeEach(resetRevalidate);

  it('revalidates a published document', () => {
    call(revalidateAfterChange(pathsFor), { doc: { id: 1, slug: 'a', _status: 'published' } });
    expect(revalidated()).toEqual(['/', '/things/a']);
  });

  it('also revalidates the old slug when it changes', () => {
    call(revalidateAfterChange(pathsFor), {
      doc: { id: 1, slug: 'b', _status: 'published' },
      previousDoc: { id: 1, slug: 'a', _status: 'published' },
    });
    expect(revalidated()).toEqual(['/', '/things/b', '/things/a']);
  });

  it('revalidates on unpublish so the page disappears', () => {
    call(revalidateAfterChange(pathsFor), {
      doc: { id: 1, slug: 'a', _status: 'draft' },
      previousDoc: { id: 1, slug: 'a', _status: 'published' },
    });
    expect(revalidated()).toEqual(['/', '/things/a']);
  });

  it('ignores draft-only saves', () => {
    call(revalidateAfterChange(pathsFor), {
      doc: { id: 1, slug: 'a', _status: 'draft' },
      previousDoc: { id: 1, slug: 'a', _status: 'draft' },
    });
    expect(revalidated()).toEqual([]);
  });

  it('ignores the empty previousDoc Payload passes when a draft is created', () => {
    call(revalidateAfterChange(pathsFor), { doc: { id: 1, slug: 'a', _status: 'draft' }, previousDoc: {} });
    expect(revalidated()).toEqual([]);
  });

  it('treats documents without drafts as published', () => {
    call(revalidateAfterChange(pathsFor), { doc: { id: 1, slug: 'a' } });
    expect(revalidated()).toEqual(['/', '/things/a']);
  });

  it('honours context.skipRevalidate for bulk imports', () => {
    call(revalidateAfterChange(pathsFor), {
      doc: { id: 1, slug: 'a', _status: 'published' },
      context: { skipRevalidate: true },
    });
    expect(revalidated()).toEqual([]);
  });

  it('logs instead of throwing outside a Next.js request', () => {
    const outsideRequest = () => {
      throw new Error('static generation store missing');
    };
    vi.mocked(revalidatePath).mockImplementationOnce(outsideRequest).mockImplementationOnce(outsideRequest);
    const doc = { id: 1, slug: 'a', _status: 'published' };
    expect(call(revalidateAfterChange(pathsFor), { doc })).toBe(doc);
    expect(req.payload.logger.warn).toHaveBeenCalled();
  });
});

describe('revalidateAfterDelete', () => {
  beforeEach(resetRevalidate);

  it('revalidates a deleted published document', () => {
    call(revalidateAfterDelete(pathsFor), { doc: { id: 1, slug: 'a', _status: 'published' } });
    expect(revalidated()).toEqual(['/', '/things/a']);
  });

  it('skips deleted drafts', () => {
    call(revalidateAfterDelete(pathsFor), { doc: { id: 1, slug: 'a', _status: 'draft' } });
    expect(revalidated()).toEqual([]);
  });
});
