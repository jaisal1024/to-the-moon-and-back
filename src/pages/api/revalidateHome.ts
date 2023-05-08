import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  message: string;
};

/*
 * This endpoint is called by myself when I want to revalidate the homepage only. It's hacky but allows 2 functions to be called so we get around the 10s timeout.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    if (req.headers.secret !== process.env.SANITY_WEBHOOK_SECRET) {
      console.warn('Invalid token');
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.log('Updating homepage route...');
    await res.revalidate('/', { unstable_onlyGenerated: true });
    return res.json({ message: 'Revalidated homepage' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}
