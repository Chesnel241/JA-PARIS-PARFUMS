import { z } from "zod";
import "@/lib/zod-fr";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(128),
});
