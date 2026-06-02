-- AlterTable
ALTER TABLE "Bien" ADD COLUMN "snapshotTitre" TEXT,
ADD COLUMN "snapshotDescription" TEXT,
ADD COLUMN "snapshotPhotos" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "snapshotDate" TIMESTAMP(3),
ADD COLUMN "annonceRetiree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "annonceDerniereVerif" TIMESTAMP(3);
