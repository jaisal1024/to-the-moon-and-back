import { type CollectionBeforeOperationHook, Forbidden } from 'payload';

/**
 * Payload's first-register endpoint lets anyone create the first admin while the
 * users table is empty. On Vercel deployments that is a takeover risk, so there
 * accounts can only be created by a signed-in admin or through the Local API
 * (`bun run create-admin`). Locally and in CI the normal first-user flow still works.
 */
export const blockAnonymousSignup: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  const deployed = Boolean(process.env.VERCEL);
  if (deployed && operation === 'create' && !req.user && req.payloadAPI !== 'local') {
    throw new Forbidden(req.t);
  }
  return args;
};
