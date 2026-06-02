-- CreateEnum
CREATE TYPE "SharedAccessStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('LOVE', 'LIKE', 'DISLIKE');

-- AlterTable
ALTER TABLE "Bien" ADD COLUMN "votes" JSONB;

-- CreateTable
CREATE TABLE "SharedAccess" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "guestId" TEXT,
    "guestEmail" TEXT NOT NULL,
    "status" "SharedAccessStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SharedAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BienVote" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" "VoteType" NOT NULL,
    "comment" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BienVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedAccess_token_key" ON "SharedAccess"("token");
CREATE UNIQUE INDEX "SharedAccess_ownerId_guestEmail_key" ON "SharedAccess"("ownerId", "guestEmail");
CREATE INDEX "SharedAccess_guestId_idx" ON "SharedAccess"("guestId");
CREATE INDEX "SharedAccess_token_idx" ON "SharedAccess"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BienVote_bienId_userId_key" ON "BienVote"("bienId", "userId");
CREATE INDEX "BienVote_bienId_idx" ON "BienVote"("bienId");

-- AddForeignKey
ALTER TABLE "SharedAccess" ADD CONSTRAINT "SharedAccess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedAccess" ADD CONSTRAINT "SharedAccess_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BienVote" ADD CONSTRAINT "BienVote_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BienVote" ADD CONSTRAINT "BienVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
