# QA — suite de tests automatisés (Playwright)

Filet de sécurité avant mise en production : tests **API** (HTTP pur, sans navigateur) et tests **navigateur** desktop et mobile, sur une application déjà démarrée.

## Lancer la suite en local

Prérequis : PostgreSQL migré et seedé, `.env` renseigné (voir `.env.example`), dépendances installées.

```bash
npx prisma migrate deploy && npm run db:seed
nohup npx next dev -p 3005 > dev.log 2>&1 &     # ou le serveur standalone (plus bas)
npm run test:e2e                                  # toute la suite
npx playwright test --project=api                 # API seulement (rapide, aucun navigateur)
npx playwright test --project=desktop tests/e2e/checkout.spec.ts
npm run test:e2e:ui                               # mode interactif
npx playwright show-report                        # rapport HTML (playwright-report/)
```

Variables d'environnement lues par la suite :

| Variable | Défaut | Rôle |
|---|---|---|
| `BASE_URL` | `http://localhost:3005` | application testée (doit avoir la même origine que `AUTH_URL`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | valeurs du `.env` local | compte admin créé par le seed |
| `PW_WORKERS` | moitié des CPU (2 en CI) | parallélisme |
| `PW_CHROMIUM_EXECUTABLE` | auto | forcer un binaire Chromium |

Chromium : en CI, `npx playwright install --with-deps chromium`. Dans un environnement où les navigateurs sont préinstallés dans `PLAYWRIGHT_BROWSERS_PATH` dans une autre révision que celle attendue par `@playwright/test`, `playwright.config.ts` réutilise automatiquement le Chromium local (pas de téléchargement).

### Serveur de production local (même procédure que la CI)

`output: "standalone"` : `next start` ne sert pas correctement les assets en local. Utiliser :

```bash
npm run build
SERVER_DIR="$(dirname "$(find .next/standalone -name server.js -not -path '*/node_modules/*' | head -n 1)")"
cp -r .next/static "$SERVER_DIR/.next/static" && cp -r public "$SERVER_DIR/public" && cp .env "$SERVER_DIR/.env"
(cd "$SERVER_DIR" && PORT=3005 HOSTNAME=127.0.0.1 node server.js)
```

(Dans un worktree git, Next déduit parfois la racine du dépôt parent et imbrique `server.js` dans `.next/standalone/<chemin>/` : d'où le `find`.)

## CI (`.github/workflows/ci.yml`)

Sur `pull_request` et `push` vers `main` : service PostgreSQL 16, Node 20, `npm ci`, Chromium, `prisma migrate deploy`, seed, `typecheck`, `lint`, `build`, démarrage du serveur standalone sur `127.0.0.1:3005`, attente de disponibilité, `npm run test:e2e`. En cas d'échec, `playwright-report/`, `test-results/` (traces, captures) et `server.log` sont publiés en artefact. `retries: 1` en CI uniquement.

## Structure

```
playwright.config.ts        projets setup / api / desktop (1440×900) / mobile (390×844, tactile)
tests/
  setup/admin.setup.ts      connexion admin via l'API Auth.js → tests/.auth/admin.json + préchauffage des routes
  fixtures.ts               `adminRequest` (contexte HTTP admin), `problems` (console/pageerror/réponses >= 400)
  helpers/
    env.ts                  BASE_URL, identifiants, chemins
    auth.ts                 connexion Credentials (csrf → callback), IP x-forwarded-for unique
    factories.ts            données uniques (préfixe `qa-`), produits, commandes, articles…
    admin-api.ts            lectures d'état via /api/admin (candidatures, newsletter, upload)
    images.ts               PNG/JPEG générés en mémoire, SVG malveillant, faux PNG, > 4 Mo
    pages.ts                LISTE CENTRALE des pages publiques + découverte des routes/pages dans src/app
    browser.ts              défilement, images chargées, débordement horizontal, stub Lydia
  api/                      commandes, communauté, public/SEO, sécurité, administration
  e2e/                      qualité par page, vitrine, parcours d'achat, formulaires, back-office
```

## Conventions

- **Résistance à la refonte** : sélecteurs par rôle, libellé et texte fonctionnel (`getByRole`, `getByLabel`, regex tolérantes comme `/ajouter au panier/i`), jamais de classes CSS. L'état est vérifié par l'API (stock, commandes, inscriptions) plutôt que par l'UI. Les formulaires sont remplis par un helper unique par écran (`fillCheckoutForm`…), seul endroit à adapter si les libellés changent.
- **Indépendance des données** : chaque test crée ses propres données (slugs et emails `qa-…` horodatés), ne suppose pas une base vierge et nettoie (suppression, ou désactivation si le produit est lié à une commande). Les tests de stock utilisent un produit créé pour l'occasion.
- **Découverte automatique** : les routes `src/app/api/admin/**/route.ts` (et leurs méthodes exportées) et les pages `src/app/admin/**/page.tsx` sont scannées au démarrage : toute nouvelle route admin est testée (401 sans session, redirection vers la connexion).
- **Rate limit** : tout test qui provoque des échecs de connexion envoie un `x-forwarded-for` unique, pour ne pas bloquer le compte admin partagé.
- **Aucune attente arbitraire** (`waitForTimeout` proscrit) : attentes sur réponses, URL et assertions auto-réessayées.
- **Nouvelle page publique** : l'ajouter à `PUBLIC_PAGES` dans `tests/helpers/pages.ts` (contrôles lang, title, h1 unique, console, débordement, images en 390 px et 1440 px).
- **Bugs connus** : `test.fixme()` + commentaire `// BUG: …`. Une fois le bug corrigé, remplacer `test.fixme(` par `test(` (ou supprimer la ligne `test.fixme(condition, …)`) et vérifier que le test passe.

## Bugs trouvés (état du code `fce24e1`)

| # | Gravité | Bug | Repro minimale | Fichier probable | Test (fixme) |
|---|---|---|---|---|---|
| 1 | **Critique** | Le rate limit de connexion se contourne par requêtes **parallèles** : lecture puis upsert non atomiques, le compteur est écrasé. Après 10 échecs simultanés, le bon mot de passe est accepté. | 10 POST `/api/auth/callback/credentials` concurrents avec un mauvais mot de passe (même IP), puis le bon → session ouverte | `src/lib/login-rate-limit.ts` | `api/security.spec.ts` « 10 échecs concurrents » |
| 2 | **Haute** | Un produit **désactivé** reste commandable par l'API (201, stock décrémenté) : `createOrder` ne filtre pas `product.isActive`. | PATCH produit `{isActive:false}` puis POST `/api/orders` → 201 | `src/lib/order-service.ts` | `api/orders.spec.ts` « produit désactivé » |
| 3 | **Haute** | Upload média : seul le MIME **déclaré par le client** est vérifié. Un HTML ou un SVG envoyé en `image/png` est accepté puis servi par `/api/media/<id>`. | multipart `file` = `<script>…` avec `type=image/png` → 201 | `src/app/api/admin/media/route.ts` | `api/security.spec.ts` « faux PNG », « SVG déguisé » |
| 4 | **Haute** | La confirmation de commande n'affiche **ni référence ni montant**, et redirige automatiquement au bout de 2 s vers un lien Lydia fixe : impossible de payer le bon montant ou de rapprocher le paiement de la commande. | commander depuis `/panier` | `src/app/(site)/panier/page.tsx` | `e2e/checkout.spec.ts` « référence et total » |
| 5 | **Haute** | Newsletter de l'accueil factice : le champ est vidé et « Merci » s'affiche, mais `POST /api/newsletter` n'est jamais appelé. | s'inscrire sur `/` → rien dans `/api/admin/newsletter` | `src/app/(site)/home-content.tsx` | `e2e/forms.spec.ts` « newsletter » |
| 6 | Moyenne | `/ambassadrices` et `/boutiques` affichent des listes **codées en dur** : ce qui est créé ou désactivé dans l'admin n'apparaît jamais. | POST `/api/admin/ambassadors` → absent de `/ambassadrices` | `src/app/(site)/ambassadrices/page.tsx`, `src/app/(site)/boutiques/page.tsx` | `api/admin.spec.ts` (×2) |
| 7 | Moyenne | Aucun **formulaire de candidature** sur `/ambassadrices` (l'API existe mais n'est reliée à aucune UI). | ouvrir `/ambassadrices` | `src/app/(site)/ambassadrices/page.tsx` | `e2e/forms.spec.ts` « candidature » |
| 8 | Moyenne | **Soft 404** : les fiches produit et articles inexistants ou dépubliés renvoient la page « introuvable » avec le **statut 200**, en dev comme en production. `loading.tsx` démarre le streaming avant `notFound()`. | `curl -I /produit/inexistant` → 200 | `src/app/(site)/loading.tsx` (+ pages `[slug]`) | `e2e/storefront.spec.ts`, `api/admin.spec.ts` (×2) |
| 9 | Moyenne | Une commande **annulée** (stock déjà restitué) peut repasser en `SHIPPED`/`DELIVERED` via `set-status`. | PATCH `{action:"cancel"}` puis `{action:"set-status",status:"SHIPPED"}` → 200 | `src/lib/order-service.ts` (`setOrderStatus`) | `api/admin.spec.ts` « commande annulée » |
| 10 | Basse | Pas de borne max sur `items[].quantity` : 1 000 000 ou 2^31 passent la validation (409 au lieu de 422). | POST `/api/orders` quantity=2147483648 → 409 | `src/lib/order-validation.ts` | `api/orders.spec.ts` « quantité énorme » |
| 11 | Basse | `/recherche?q=…` ignore le paramètre `q` (lien de recherche non partageable). | ouvrir `/recherche?q=rose` → aucun résultat | `src/components/product-search.tsx` | `e2e/storefront.spec.ts` « ?q= » |
| 12 | Basse | Deux `h1` sur l'accueil (filigrane « JAE PARIS » + titre du héro). | ouvrir `/` | `src/app/(site)/home-content.tsx` | `e2e/quality.spec.ts` (accueil, structure) |

Observations sans test bloquant :

- L'icône « Mon compte » du header mène à `/compte`, qui redirige vers la **connexion admin** : il n'existe pas de compte client.
- Le lien « Espace maison » (`/admin`) du pied de page est préchargé par `next/link` pour tous les visiteurs. Chaque préchargement déclenche une redirection du middleware. En HTTP local, la CSP `upgrade-insecure-requests` transforme cette redirection en `https://…`, qui échoue ; ce bruit console est filtré dans `tests/fixtures.ts`, uniquement quand `BASE_URL` est en `http://`.
- Menu mobile fermé : les liens restent dans l'arbre d'accessibilité et atteignables au clavier (tiroir seulement translaté hors écran).
- `robots.txt` n'exclut ni `/admin` ni `/api`.
- La déconnexion n'invalide pas le JWT côté serveur (sessions JWT sans état, 8 h).
