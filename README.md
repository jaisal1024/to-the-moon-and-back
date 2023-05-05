# To The Moon and Back -- A fun little site

This is my little headless CMS + Next baby for my photography and personal site.

Visit either:

- [jaisal.xyz](https://www.jaisal.xyz/)
- [jaisalfriedman.com](https://www.jaisalfriedman.com/)

## Architecture

- Next.js is used for SSG of static pages during the build process
- Sanity.io is used as a headless CMS to manage and fetch collections (photography series). We use their graphql API instead of grok to make queries so we have strict types. And because grok is weird.
- Tailwind + MUI are used to style the site
- React is used in conjunction with Next.js/MUI but is relatively lightweight here

TODO:

- Support browsing more pages in the home route. Currently only shows 10 collections match.
- Re-deploy Next pages on Edits in Sanity studio.
- Consider wrapping calls to sanity behind a redis cache to limit hits on Sanity APIs

## Weird things

- Sanity's GraphQL API isn't great so there are a few weird things: 1. We fetch all the photos in each collection which is too much data for the `GetCollections` homepage query. This is because sanity doesn't allow subquery elements in the graph have a limit field. Which is to say the least, extremely limiting. I opened an issue here.
- To get a collection by the slug instead of the collection ID, i had to use the `allCollections` top-level query instead of the `collection` query. We could store some sort of mapping from slug to collection but it would be outside of sanity which may get strange if they get out of sync somehow
- Sanity data migrations are hard, `_type` cannot be properly re-named as the same objects so there is a little script in `scripts/migrateDocumentType.js` that does that but use with caution and try to avoid data migrations with Sanity.
- Sanity Image URL parsing and usage with NextImage component is a little strange
- Sanity requires all array fields of objects to be top-level objects if using the graphql API. For that reason the `Shot` document type is shown in the studio admin page but its just there so it can be used for photos in a collection. We store things like the title and maybe credits in the future on the `Shot` object along with the photo.

## Development

- `yarn dev` starts the dev next server on port [3333](http://localhost:3333/) and runs graphql codegen in watch mode.
- `yarn graphql-deploy` will deploy changes to the schame file to the graphql endpoint. You must do this and restart the server to see changes reflected.
- Visit `/studio` route to view the sanity admin panel where you can create a collection.

## Site Map

- `/` shows all photography collections sorted by most recent
- `/collections/[slug]` is a single photography series (a collection) with a title, date, description, etc. In the future, I may toy with a Next/Previous collection. The slug is a readable hyphenated string from the collection title.
- `about` is my personal static homepage about me

## Deployment

- Auto deploys to vercel on merge to main!

## Revalidation

Since we are using Next.js static pages to generate the website at build time, changes made in the CMS need to trigger a re-build of the affected pages. We use Next incremental ISR feature for this with Sanity webhooks.

There are two webhooks I set up: 1 for development and 1 for production. The development hook uses ngrok to expose a local host site (localhost://3000) to the internet for sanity webhooks to trigger. You cannot use a webhook with localhost (obviously). To set it up:

1. Create a production build and start the next server: `yarn build && yarn start`
2. Run: `yarn ngrok-start`
3. Take that URL and add it to the Sanity webhook UI for the development mode
4. Open `localhost:3000/studio` and make changes to a collection.
5. Watch the static regeneration in the console and check the UI afterwards
