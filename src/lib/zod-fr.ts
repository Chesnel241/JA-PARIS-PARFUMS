import { z } from "zod";

// Messages de validation Zod en français (champ `fields` des réponses 422 et
// formulaires admin). Import à effet de bord : `import "@/lib/zod-fr";`.
z.config(z.locales.fr());

export {};
