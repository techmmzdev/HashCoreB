/*
  Warnings:

  - The values [DRAFT] on the enum `PublicationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PublicationStatus_new" AS ENUM ('SCHEDULED', 'PUBLISHED');
ALTER TABLE "public"."publications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "publications" ALTER COLUMN "status" TYPE "PublicationStatus_new" USING ("status"::text::"PublicationStatus_new");
ALTER TYPE "PublicationStatus" RENAME TO "PublicationStatus_old";
ALTER TYPE "PublicationStatus_new" RENAME TO "PublicationStatus";
DROP TYPE "public"."PublicationStatus_old";
ALTER TABLE "publications" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
COMMIT;

-- AlterTable
ALTER TABLE "publications" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
