import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('secret');
    if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
      console.warn('Invalid token');
      return new Response(JSON.stringify({ message: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const route = req.headers.get('route');
    if (!route || typeof route !== 'string') {
      console.warn('No route provided or incorrect type');
      return new Response(JSON.stringify({ message: 'No route provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Updating ${route} route...`);
    revalidatePath(route);

    return new Response(JSON.stringify({ message: `Revalidated ${route}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
