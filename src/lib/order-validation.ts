import { z } from "zod";

export const orderItemInputSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  image: z.string().trim().min(1),
  volume: z.string().trim().min(1),
  price: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

export const orderInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  items: z.array(orderItemInputSchema).min(1).max(50),
  deliveryAddress: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    address: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(20),
    country: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(1).max(30).optional(),
  }),
});

export type OrderInput = z.infer<typeof orderInputSchema>;
