-- AlterTable
ALTER TABLE "Bien" ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "lastKnownPrix" INTEGER;

-- CreateTable
CREATE TABLE "PriceCheck" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ancienPrix" INTEGER NOT NULL,
    "nouveauPrix" INTEGER NOT NULL,
    "pourcentage" DOUBLE PRECISION NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceCheck_userId_seen_idx" ON "PriceCheck"("userId", "seen");

-- CreateIndex
CREATE INDEX "PriceCheck_bienId_idx" ON "PriceCheck"("bienId");

-- AddForeignKey
ALTER TABLE "PriceCheck" ADD CONSTRAINT "PriceCheck_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;
