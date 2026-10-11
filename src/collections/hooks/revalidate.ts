import { revalidatePath } from 'next/cache';
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from 'payload';

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

const PUBLISHED_BEFORE = 'revalidatePublishedBefore';
const snapshotKey = (collection: string, id: number | string) => `${collection}:${id}`;

const snapshots = (context: Record<string, unknown>) =>
  (context[PUBLISHED_BEFORE] ??= new Map<string, unknown>()) as Map<string, unknown>;

/**
 * Records what the site is serving for a document before it changes.
 *
 * With drafts enabled, the `previousDoc` Payload gives `afterChange` is the latest
 * version, which is a draft whenever one was saved on top of a published document.
 * Unpublishing, or publishing a slug changed in a draft, would then never clear the
 * live URL. This reads the published row instead and passes it on through `context`.
 */
export const rememberPublished: CollectionBeforeChangeHook = async ({
  collection,
  context,
  data,
  operation,
  originalDoc,
  req,
}) => {
  const id = (originalDoc as { id?: number | string } | undefined)?.id;
  if (operation !== 'update' || id == null || !collection.versions?.drafts || shouldSkip(context)) return data;
  try {
    // No `req`: this reads committed state, and passing it would replace `req.context`.
    const published = await req.payload.findByID({
      collection: collection.slug,
      id,
      depth: 0,
      draft: false,
      disableErrors: true,
    });
    if (published) snapshots(context).set(snapshotKey(collection.slug, id), published);
  } catch (err) {
    // Fall back to `previousDoc` rather than block the save.
    req.payload.logger.warn({ err }, `Could not read the published ${collection.slug} ${id} before the change`);
  }
  return data;
};

/**
 * Revalidates the pages for both the new and previously published versions of a
 * document, so slug changes and unpublishing also clear the old URL. Drafts are
 * ignored. Pair with `rememberPublished` in `beforeChange` on collections with drafts.
 */
export function revalidateAfterChange<T extends MaybeDraft>(
  pathsFor: PathsFor<T>,
  options: RevalidateOptions = {},
): CollectionAfterChangeHook<T & { id: number | string }> {
  return ({ collection, doc, previousDoc, context, operation, req }) => {
    if (shouldSkip(context)) return doc;
    if (operation === 'create' && options.onCreate === false) return doc;
    const remembered = collection && snapshots(context).get(snapshotKey(collection.slug, doc.id));
    const before = (remembered ?? previousDoc) as typeof previousDoc;
    const paths = new Set<string>();
    if (isLive(doc)) pathsFor(doc).forEach((p) => paths.add(p));
    if (isLive(before)) pathsFor(before).forEach((p) => paths.add(p));
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
