import type { TextField } from 'payload';

/**
 * The original Sanity document or asset `_id`. scripts/migrate-from-sanity.ts uses it
 * to update instead of duplicate on re-runs. Remove once Sanity is decommissioned.
 */
export const sanityIdField: TextField = {
  name: 'sanityId',
  type: 'text',
  unique: true,
  index: true,
  admin: { hidden: true, readOnly: true },
};
