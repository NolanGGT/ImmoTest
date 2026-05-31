-- CreateTable
CREATE TABLE "PersonalPoint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7c3aed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalPoint_userId_idx" ON "PersonalPoint"("userId");

-- AddForeignKey
ALTER TABLE "PersonalPoint" ADD CONSTRAINT "PersonalPoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
