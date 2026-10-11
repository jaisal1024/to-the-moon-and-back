import { revalidatePath } from 'next/cache';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload';

type MaybeDraft = { _status?: 'draft' | 'published' | null };

/** Maps a document to the site paths that render it. */
type PathsFor<T> = (doc: T) => string[];

/**
 * `layout` also revalidates every page beneath each path; use it for content shown
 * in a shared layout, such as the collections list in the nav on every page.
 */
type RevalidateOptions = {
  type?: 'layout' | 'page';
  /** Set false when a newly created document cannot appear on any page yet (media uploads). */
  onCreate?: boolean;
};

/** Set `context: { skipRevalidate: true }` on Local API calls (bulk imports) to skip this. */
const shouldSkip = (context: Record<string, unknown>) => context.skipRevalidate === true;

// Collections without drafts have no `_status`; treat them as always published.
// Payload passes `previousDoc: {}` on create, so a document must have an id to count.
const isLive = (doc: MaybeDraft | undefined | null) =>
  doc != null && (doc as { id?: unknown }).id != null && doc._status !== 'draft';

function revalidate(paths: Iterable<string>, req: PayloadRequest, { type }: RevalidateOptions) {
  for (const path of paths) {
    try {
      revalidatePath(path, type);
      req.payload.logger.info(`Revalidated ${path}`);
    } catch (err) {
      // revalidatePath throws outside a Next.js request (CLI scripts, migrations).
      req.payload.logger.warn({ err, path }, `Skipped revalidating ${path}`);
    }
  }
}

/**
 * Revalidates the pages for both the new and previous versions of a document,
 * so slug changes and unpublishing also clear the old URL. Drafts are ignored.
 */
export function revalidateAfterChange<T extends MaybeDraft>(
  pathsFor: PathsFor<T>,
  options: RevalidateOptions = {},
): CollectionAfterChangeHook<T & { id: number | string }> {
  return ({ doc, previousDoc, context, operation, req }) => {
    if (shouldSkip(context)) return doc;
    if (operation === 'create' && options.onCreate === false) return doc;
    const paths = new Set<string>();
    if (isLive(doc)) pathsFor(doc).forEach((p) => paths.add(p));
    if (isLive(previousDoc)) pathsFor(previousDoc).forEach((p) => paths.add(p));
    revalidate(paths, req, options);
    return doc;
  };
}

export function revalidateAfterDelete<T extends MaybeDraft>(
  pathsFor: PathsFor<T>,
  options: RevalidateOptions = {},
): CollectionAfterDeleteHook<T & { id: number | string }> {
  return ({ doc, context, req }) => {
    if (shouldSkip(context) || !isLive(doc)) return doc;
    revalidate(pathsFor(doc), req, options);
    return doc;
  };
}
