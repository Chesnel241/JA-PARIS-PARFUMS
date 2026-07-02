import { z } from "zod";
import { imageReferenceSchema } from "@/lib/product-validation";

export const articleInputSchema = z.object({
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().toLowerCase().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().min(10).max(500),
  content: z.string().trim().min(10).max(50_000),
  coverImage: imageReferenceSchema,
  isPublished: z.boolean(),
});

export const articleStatusSchema = z.object({ isPublished: z.boolean() });
export type ArticleInput = z.infer<typeof articleInputSchema>;
