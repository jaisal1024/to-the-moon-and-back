/**
 * Creates or updates an admin account through the Local API.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... bun run create-admin
 *
 * Deployed sites block the public first-user signup, so run this against a new
 * database before its first deploy. Re-running updates the password.
 */
import config from '@payload-config';
import { getPayload } from 'payload';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD.');

  const payload = await getPayload({ config });
  const { docs } = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 });
  if (docs[0]) {
    await payload.update({ collection: 'users', id: docs[0].id, data: { password } });
    console.log(`Updated password for ${email}.`);
  } else {
    await payload.create({ collection: 'users', data: { email, password } });
    console.log(`Created admin ${email}.`);
  }
}

try {
  await main();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
