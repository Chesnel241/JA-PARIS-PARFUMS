import { z } from "zod";
import "@/lib/zod-fr";
import { imageReferenceSchema } from "@/lib/product-validation";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => (value ? value : null));

export const ambassadorInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().max(80),
  photo: imageReferenceSchema,
  description: z.string().trim().min(10).max(600),
  instagram: optionalText(80),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

export const storeInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(4).max(200),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  phone: optionalText(40),
  openingHours: z.string().trim().min(2).max(200),
  image: imageReferenceSchema,
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

export const activeStatusSchema = z.object({ isActive: z.boolean() });

// Formulaire public « Devenir ambassadrice ». `website` est un pot de miel :
// invisible pour les humains, rempli par les robots → la candidature est ignorée.
export const applicationInputSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: optionalText(40),
  instagram: optionalText(80),
  city: optionalText(80),
  message: z.string().trim().min(20).max(2000),
  website: z.string().max(200).optional(),
});

export const applicationStatusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "ACCEPTED", "REJECTED"]),
});

export type AmbassadorInput = z.infer<typeof ambassadorInputSchema>;
export type StoreInput = z.infer<typeof storeInputSchema>;
export type ApplicationInput = z.infer<typeof applicationInputSchema>;
