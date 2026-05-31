-- AlterTable
ALTER TABLE "Bien" ADD COLUMN     "historiqueScores" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "SharedAnalyse" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedAnalyse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedAnalyse_token_key" ON "SharedAnalyse"("token");

-- AddForeignKey
ALTER TABLE "SharedAnalyse" ADD CONSTRAINT "SharedAnalyse_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;
