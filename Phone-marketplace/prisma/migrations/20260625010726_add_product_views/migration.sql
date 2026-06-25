-- CreateTable
CREATE TABLE "ProductView" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductView_productId_createdAt_idx" ON "ProductView"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProductView_createdAt_idx" ON "ProductView"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProductView_userId_idx" ON "ProductView"("userId");

-- CreateIndex
CREATE INDEX "ProductView_ipAddress_createdAt_idx" ON "ProductView"("ipAddress", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;