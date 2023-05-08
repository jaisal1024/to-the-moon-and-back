import type { NextApiRequest, NextApiResponse } from 'next';
import { parseBody } from 'next-sanity/webhook';

type Data = {
  message: string;
};
type IncomingBody = {
  type: string;
  slug: string;
};

// Export the config from next-sanity to enable validating the request body signature properly
export { config } from 'next-sanity/webhook';

/*
 * This endpoint is called by Sanity when a document is published. It only supports collections for now.
 * See incremental ISR and Sanity webhooks - https://dev.to/valse/nextjs-on-demand-isr-by-sanity-groq-powered-webhooks-221n
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const { isValidSignature, body } = await parseBody(
      req,
      process.env.SANITY_WEBHOOK_SECRET
    );

    if (!isValidSignature) {
      const message = 'Invalid signature';
      console.warn(message);
      res.status(401).json({ message });
      return;
    }

    const { type, slug } = body as unknown as IncomingBody;

    switch (type) {
      case 'collections':
        // always revalidate homepage too since it uses collections data
        console.log(`Updating routes: ${type} with slug ${slug}`);
        await res.revalidate(`/collections/${slug}`, {
          unstable_onlyGenerated: true,
        });
        // revalidate homepage route too
        await res.revalidate('/', { unstable_onlyGenerated: true });
        return res.json({
          message: `Revalidated "${type}" with slug "${slug}"`,
        });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}
