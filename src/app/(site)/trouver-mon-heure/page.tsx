import { Quiz } from "@/components/quiz/quiz";
import { pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Trouver mon heure",
    description: "Quatre questions sur vos moments, vos matières et le sillage dont vous rêvez : trouvez l’eau de parfum JAE Paris qui vous ressemble.",
    path: "/trouver-mon-heure",
  });
}

export default function TrouverMonHeurePage() {
  return <Quiz />;
}
