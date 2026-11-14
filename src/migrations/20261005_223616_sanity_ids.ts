import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "sanity_id" varchar;
  ALTER TABLE "collections" ADD COLUMN "sanity_id" varchar;
  ALTER TABLE "_collections_v" ADD COLUMN "version_sanity_id" varchar;
  ALTER TABLE "posts" ADD COLUMN "sanity_id" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_sanity_id" varchar;
  CREATE UNIQUE INDEX "media_sanity_id_idx" ON "media" USING btree ("sanity_id");
  CREATE UNIQUE INDEX "collections_sanity_id_idx" ON "collections" USING btree ("sanity_id");
  CREATE INDEX "_collections_v_version_version_sanity_id_idx" ON "_collections_v" USING btree ("version_sanity_id");
  CREATE UNIQUE INDEX "posts_sanity_id_idx" ON "posts" USING btree ("sanity_id");
  CREATE INDEX "_posts_v_version_version_sanity_id_idx" ON "_posts_v" USING btree ("version_sanity_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_sanity_id_idx";
  DROP INDEX "collections_sanity_id_idx";
  DROP INDEX "_collections_v_version_version_sanity_id_idx";
  DROP INDEX "posts_sanity_id_idx";
  DROP INDEX "_posts_v_version_version_sanity_id_idx";
  ALTER TABLE "media" DROP COLUMN "sanity_id";
  ALTER TABLE "collections" DROP COLUMN "sanity_id";
  ALTER TABLE "_collections_v" DROP COLUMN "version_sanity_id";
  ALTER TABLE "posts" DROP COLUMN "sanity_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_sanity_id";`)
}
