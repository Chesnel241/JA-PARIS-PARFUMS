import { z } from "zod";

export const productVariantInputSchema = z.object({
  sku: z.string().trim().toUpperCase().min(3).max(64).regex(/^[A-Z0-9_-]+$/),
  volume: z.string().trim().min(1).max(32),
  price: z.number().int().nonnegative().max(10_000_000),
  stock: z.number().int().nonnegative().max(1_000_000),
  isActive: z.boolean(),
});

export const productCategorySchema = z.enum(["PARFUM", "ACCESSOIRE"]);

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: productCategorySchema.default("PARFUM"),
  description: z.string().trim().min(10).max(2_000),
  story: z.string().trim().min(10).max(10_000),
  images: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
  notesTop: z.array(z.string().trim().min(1).max(80)).max(12),
  notesHeart: z.array(z.string().trim().min(1).max(80)).max(12),
  notesBase: z.array(z.string().trim().min(1).max(80)).max(12),
  isActive: z.boolean(),
  variants: z.array(productVariantInputSchema).min(1).max(12),
}).superRefine((product, context) => {
  const skus = new Set<string>();
  const volumes = new Set<string>();
  product.variants.forEach((variant, index) => {
    if (skus.has(variant.sku)) context.addIssue({ code: "custom", path: ["variants", index, "sku"], message: "Le SKU est dupliqué." });
    if (volumes.has(variant.volume.toLowerCase())) context.addIssue({ code: "custom", path: ["variants", index, "volume"], message: "La contenance est dupliquée." });
    skus.add(variant.sku);
    volumes.add(variant.volume.toLowerCase());
  });
});

export const productStatusSchema = z.object({ isActive: z.boolean() });
export type ProductInput = z.infer<typeof productInputSchema>;
