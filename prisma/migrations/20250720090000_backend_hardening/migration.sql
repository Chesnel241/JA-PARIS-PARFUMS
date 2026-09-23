-- Durcissement backend : référence de commande lisible, montants détaillés,
-- limiteur de débit partagé (serverless) et index des requêtes fréquentes.
-- Migration sûre sur une base de production contenant déjà des données :
-- aucune colonne NOT NULL sans valeur par défaut, rétro-remplissage inclus.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reference" TEXT,
ADD COLUMN     "shippingAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subtotalAmount" INTEGER NOT NULL DEFAULT 0;

-- Rétro-remplissage des commandes existantes : sous-total = somme des lignes,
-- livraison = total - sous-total (jamais négative).
UPDATE "Order" AS o
SET "subtotalAmount" = s."subtotal",
    "shippingAmount" = GREATEST(o."totalAmount" - s."subtotal", 0)
FROM (
  SELECT "orderId", SUM("price" * "quantity")::INTEGER AS "subtotal"
  FROM "OrderItem"
  GROUP BY "orderId"
) AS s
WHERE s."orderId" = o."id";

-- Référence des commandes existantes : même libellé que celui affiché jusqu'ici
-- dans l'admin (#XXXXXXXX), préfixé « JAE- ». En cas (très improbable) de
-- doublon, on se rabat sur l'identifiant complet, unique par construction.
UPDATE "Order" SET "reference" = 'JAE-' || UPPER(RIGHT("id", 8)) WHERE "reference" IS NULL;
UPDATE "Order" SET "reference" = 'JAE-' || UPPER("id")
WHERE "reference" IN (SELECT "reference" FROM "Order" GROUP BY "reference" HAVING COUNT(*) > 1);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE INDEX "Article_isPublished_publishedAt_idx" ON "Article"("isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_createdAt_idx" ON "NewsletterSubscriber"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_email_idx" ON "Order"("email");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Product_isActive_category_createdAt_idx" ON "Product"("isActive", "category", "createdAt");
