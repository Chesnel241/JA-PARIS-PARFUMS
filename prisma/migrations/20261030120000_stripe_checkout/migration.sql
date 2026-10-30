-- Paiement par carte bancaire (Stripe Checkout) : PaymentIntent encaissé.
ALTER TABLE "Order" ADD COLUMN "stripePaymentIntentId" TEXT;

CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
