import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

/** One Payload instance per request; Payload itself caches the instance across requests. */
export const getCms = cache(() => getPayload({ config }));
