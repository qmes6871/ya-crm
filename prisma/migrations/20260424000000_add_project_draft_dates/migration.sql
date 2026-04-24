-- AlterTable
ALTER TABLE "projects" ADD COLUMN "firstDraftDate" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "firstDraftCompletedAt" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "secondDraftDate" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "secondDraftCompletedAt" TIMESTAMP(3);
