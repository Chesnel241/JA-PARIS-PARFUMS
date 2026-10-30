-- « Les Heures » : chaque parfum porte une heure de la journée.
ALTER TABLE "Product" ADD COLUMN     "family" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hour" TEXT,
ADD COLUMN     "hourFrom" TEXT,
ADD COLUMN     "moment" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "palette" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tagline" TEXT NOT NULL DEFAULT '';

-- « M'avertir du retour » : alertes de retour en stock.
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockAlert_productId_volume_idx" ON "StockAlert"("productId", "volume");
CREATE INDEX "StockAlert_createdAt_idx" ON "StockAlert"("createdAt");
CREATE UNIQUE INDEX "StockAlert_email_productId_volume_key" ON "StockAlert"("email", "productId", "volume");

ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des données : la collection actuelle reçoit ses heures, une seule
-- fois (colonnes neuves) ; tout reste ensuite modifiable depuis l'admin.
UPDATE "Product" SET "hour" = '08:00', "hourFrom" = '06:00', "moment" = 'Matin d’été', "palette" = 'soleil',
  "tagline" = 'Un matin d’été sur la peau.', "family" = 'Floral hespéridé · musqué'
WHERE "slug" = 'or-solaire' AND "category" = 'PARFUM' AND "hour" IS NULL;

UPDATE "Product" SET "hour" = '19:00', "hourFrom" = '16:00', "moment" = 'Entre chien et loup', "palette" = 'poudre',
  "tagline" = 'L’élégance de ce qu’on laisse deviner.', "family" = 'Floral fruité · poudré'
WHERE "slug" = 'illusion' AND "category" = 'PARFUM' AND "hour" IS NULL;

UPDATE "Product" SET "hour" = '00:00', "hourFrom" = '22:00', "moment" = 'Minuit', "palette" = 'grenat',
  "tagline" = 'La ville s’éteint. Vous, non.', "family" = 'Boisé ambré · épicé'
WHERE "slug" = 'nuit-souveraine' AND "category" = 'PARFUM' AND "hour" IS NULL;
