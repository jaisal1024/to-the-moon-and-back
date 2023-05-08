import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  message: string;
};

/*
 * This endpoint is called by myself when I want to revalidate any route.
 * Currently is not used, but I left it in here in case I need to revalidate the homepage only.
 * Usage: curl -X POST -H "secret: ${SANITY_WEBHOOK_SECRET}, route: '/'" https://jaisal.xyz/api/revalidateRoute
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
    const route = req.headers.route;
    if (!route || typeof route !== 'string') {
      console.warn('No route provided or incorrect type');
      return res.status(400).json({ message: 'No route provided' });
    }
    console.log(`Updating ${route} route...`);
    await res.revalidate(route, { unstable_onlyGenerated: true });
    return res.json({ message: 'Revalidated homepage' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}
