import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';
import { parseBody } from 'next-sanity/webhook';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody(
      req,
      process.env.SANITY_WEBHOOK_SECRET,
    );

    if (!isValidSignature) {
      const message = 'Invalid signature';
      console.warn(message);
      return new Response(JSON.stringify({ message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { type, slug } = body;

    switch (type) {
      case 'collections':
        console.log(`Updating routes: ${type} with slug ${slug}`);
        revalidatePath(`/collections/${slug}`);
        revalidatePath('/'); // Revalidate homepage too
        return new Response(
          JSON.stringify({
            message: `Revalidated "${type}" with slug "${slug}"`,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      default:
        return new Response(
          JSON.stringify({ message: `Ignored webhook for type: ${type}` }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
    }
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
