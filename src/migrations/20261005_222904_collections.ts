import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_collections_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__collections_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "collections_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"title" varchar
  );
  
  CREATE TABLE "collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"description" varchar,
  	"date" timestamp(3) with time zone,
  	"location" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_collections_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_collections_v_version_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_collections_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_description" varchar,
  	"version_date" timestamp(3) with time zone,
  	"version_location" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__collections_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "collections_id" integer;
  ALTER TABLE "collections_photos" ADD CONSTRAINT "collections_photos_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_photos" ADD CONSTRAINT "collections_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_collections_v_version_photos" ADD CONSTRAINT "_collections_v_version_photos_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_collections_v_version_photos" ADD CONSTRAINT "_collections_v_version_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_collections_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_collections_v" ADD CONSTRAINT "_collections_v_parent_id_collections_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "collections_photos_order_idx" ON "collections_photos" USING btree ("_order");
  CREATE INDEX "collections_photos_parent_id_idx" ON "collections_photos" USING btree ("_parent_id");
  CREATE INDEX "collections_photos_photo_idx" ON "collections_photos" USING btree ("photo_id");
  CREATE UNIQUE INDEX "collections_slug_idx" ON "collections" USING btree ("slug");
  CREATE INDEX "collections_updated_at_idx" ON "collections" USING btree ("updated_at");
  CREATE INDEX "collections_created_at_idx" ON "collections" USING btree ("created_at");
  CREATE INDEX "collections__status_idx" ON "collections" USING btree ("_status");
  CREATE INDEX "_collections_v_version_photos_order_idx" ON "_collections_v_version_photos" USING btree ("_order");
  CREATE INDEX "_collections_v_version_photos_parent_id_idx" ON "_collections_v_version_photos" USING btree ("_parent_id");
  CREATE INDEX "_collections_v_version_photos_photo_idx" ON "_collections_v_version_photos" USING btree ("photo_id");
  CREATE INDEX "_collections_v_parent_idx" ON "_collections_v" USING btree ("parent_id");
  CREATE INDEX "_collections_v_version_version_slug_idx" ON "_collections_v" USING btree ("version_slug");
  CREATE INDEX "_collections_v_version_version_updated_at_idx" ON "_collections_v" USING btree ("version_updated_at");
  CREATE INDEX "_collections_v_version_version_created_at_idx" ON "_collections_v" USING btree ("version_created_at");
  CREATE INDEX "_collections_v_version_version__status_idx" ON "_collections_v" USING btree ("version__status");
  CREATE INDEX "_collections_v_created_at_idx" ON "_collections_v" USING btree ("created_at");
  CREATE INDEX "_collections_v_updated_at_idx" ON "_collections_v" USING btree ("updated_at");
  CREATE INDEX "_collections_v_latest_idx" ON "_collections_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("collections_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "collections_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_collections_v_version_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_collections_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "collections_photos" CASCADE;
  DROP TABLE "collections" CASCADE;
  DROP TABLE "_collections_v_version_photos" CASCADE;
  DROP TABLE "_collections_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_collections_fk";
  
  DROP INDEX "payload_locked_documents_rels_collections_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "collections_id";
  DROP TYPE "public"."enum_collections_status";
  DROP TYPE "public"."enum__collections_v_version_status";`)
}
