import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

import { previewSecretDocumentId, readToken } from '../../../sanity/env';
import { client } from '../../../sanity/lib/client';
import { getPreviewSecret } from '../../../sanity/lib/previewSecret';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug');

  if (!readToken) {
    return new Response('Misconfigured server: readToken required', { status: 500 });
  }

  if (!secret) {
    return new Response('Invalid secret', { status: 401 });
  }

  const authClient = client.withConfig({ useCdn: false, token: readToken });

  const storedSecret = await getPreviewSecret({
    client: authClient,
    id: previewSecretDocumentId,
  });

  if (secret !== storedSecret) {
    return new Response('Invalid secret', { status: 401 });
  }

  if (slug) {
    const draft = await draftMode();
    draft.enable();
    return redirect(`/${slug}`);
  }

  return new Response('Slug query parameter is required', { status: 404 });
}
