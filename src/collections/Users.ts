import type { CollectionConfig } from 'payload';

import { blockAnonymousSignup } from './hooks/blockAnonymousSignup';

// Admin accounts for /admin. Email and password fields are added by `auth: true`.
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [],
  hooks: {
    beforeOperation: [blockAnonymousSignup],
  },
};
