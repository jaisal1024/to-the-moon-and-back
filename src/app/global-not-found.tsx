import { Metadata } from 'next';

import NotFound from './(site)/not-found';
import SiteDocument from './(site)/SiteDocument';

// The app has two root layouts, (site) and (payload), so unmatched URLs no longer
// fall through to a single root not-found. This renders the site's 404 instead.
export const metadata: Metadata = {
  title: 'Jaisal Friedman - Page Not Found',
};

export default function GlobalNotFound() {
  return (
    <SiteDocument>
      <NotFound />
    </SiteDocument>
  );
}
