import { revalidatePath } from 'next/cache';
import type { PayloadRequest } from 'payload';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rememberPublished, revalidateAfterChange, revalidateAfterDelete } from './revalidate';

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

describe('rememberPublished', () => {
  beforeEach(resetRevalidate);

  const things = { slug: 'things', versions: { drafts: true } };
  const published = { id: 1, slug: 'a', _status: 'published' };
  const findByID = vi.fn();
  const draftsReq = { payload: { findByID, logger: req.payload.logger } } as unknown as PayloadRequest;

  /** Runs beforeChange then afterChange with one shared context, as Payload does. */
  const save = async (doc: Doc, previousDoc: Doc, collection: Record<string, unknown> = things) => {
    const context = {};
    const shared = { req: draftsReq, context, collection, operation: 'update' };
    await rememberPublished({ ...shared, data: doc, originalDoc: previousDoc } as never);
    call(revalidateAfterChange(pathsFor), { ...shared, doc, previousDoc });
  };

  beforeEach(() => {
    findByID.mockReset();
    findByID.mockResolvedValue(published);
  });

  it('reads the published row, not the latest draft', async () => {
    await save({ id: 1, slug: 'a', _status: 'draft' }, { id: 1, slug: 'a', _status: 'draft' });
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ collection: 'things', id: 1, draft: false }));
    // Payload swaps `req.context` for a copy when a Local API call is given `req`, losing the snapshot.
    expect(findByID.mock.calls[0]?.[0]).not.toHaveProperty('req');
  });

  it('revalidates on unpublish when a draft was saved on top of the published document', async () => {
    await save({ id: 1, slug: 'a', _status: 'draft' }, { id: 1, slug: 'a', _status: 'draft' });
    expect(revalidated()).toEqual(['/', '/things/a']);
  });

  it('revalidates the live slug when a slug changed in a draft is published', async () => {
    await save({ id: 1, slug: 'b', _status: 'published' }, { id: 1, slug: 'b', _status: 'draft' });
    expect(revalidated()).toEqual(['/', '/things/b', '/things/a']);
  });

  it('still ignores saves to a document that was never published', async () => {
    findByID.mockResolvedValue({ id: 1, slug: 'a', _status: 'draft' });
    await save({ id: 1, slug: 'a', _status: 'draft' }, { id: 1, slug: 'a', _status: 'draft' });
    expect(revalidated()).toEqual([]);
  });

  it('does not query collections without drafts', async () => {
    await save({ id: 1, slug: 'b' }, { id: 1, slug: 'a' }, { slug: 'things' });
    expect(findByID).not.toHaveBeenCalled();
    expect(revalidated()).toEqual(['/', '/things/b', '/things/a']);
  });

  it('falls back to previousDoc when the lookup fails', async () => {
    findByID.mockRejectedValue(new Error('db down'));
    await save({ id: 1, slug: 'a', _status: 'draft' }, { id: 1, slug: 'a', _status: 'published' });
    expect(revalidated()).toEqual(['/', '/things/a']);
  });
});

describe('layout revalidation', () => {
  beforeEach(resetRevalidate);

  it('passes the layout type through to revalidatePath', () => {
    call(
      revalidateAfterChange(() => ['/'], { type: 'layout' }),
      { doc: { id: 1, slug: 'a', _status: 'published' } },
    );
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([['/', 'layout']]);
  });
});

describe('onCreate: false', () => {
  beforeEach(resetRevalidate);

  it('skips creates but still revalidates updates', () => {
    const hook = revalidateAfterChange(() => ['/'], { type: 'layout', onCreate: false });
    call(hook, { operation: 'create', doc: { id: 1, slug: 'a' }, previousDoc: {} });
    expect(revalidated()).toEqual([]);
    call(hook, { operation: 'update', doc: { id: 1, slug: 'a' }, previousDoc: { id: 1, slug: 'a' } });
    expect(revalidated()).toEqual(['/']);
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
