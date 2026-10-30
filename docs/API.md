# API JAE Paris

Référence de toutes les routes `src/app/api/**`. Montants **en centimes** (entiers). Textes d'erreur en français, prêts à afficher.

## Conventions

| Sujet | Règle |
|---|---|
| Format d'erreur | `{ "error": "Message lisible", "fields"?: {...}, "code"?: "...", ... }` sur **toutes** les erreurs |
| Validation (422) | `fields` = `{ formErrors: string[], fieldErrors: { champ: string[] } }` (messages Zod en français) |
| JSON invalide / corps vide | 422 `Le corps de la requête doit être un JSON valide.` |
| Corps > 1 Mo (JSON) | 413 |
| Identifiant malformé ou inconnu | 404 `<Entité> introuvable.` (jamais d'exception Prisma) |
| Unicité (slug, SKU…) | 409 |
| Base indisponible | 503 + `Retry-After: 5` |
| Erreur imprévue | 500 `Une erreur inattendue est survenue…` (détail uniquement dans les logs, préfixe `[api:<route>]`) |
| Cache | toutes les réponses JSON : `Cache-Control: no-store` |
| Auth admin | cookie de session Auth.js (`authjs.session-token`, `__Secure-authjs.session-token` en HTTPS). Sans cookie → 401 dès le middleware ; cookie invalide, compte désactivé ou rôle insuffisant → 401 dans la route |
| CSRF admin | POST/PUT/PATCH/DELETE `/api/admin/**` avec un en-tête `Origin` d'un autre site → 403 (cookies `SameSite=Lax` en plus) |
| Rôles | `ADMIN` et `EDITOR` ont accès à l'admin ; suppression d'un produit réservée à `ADMIN` (403 sinon) |
| Synchro site | chaque mutation admin appelle `revalidatePath` sur les pages publiques et admin concernées (`src/lib/revalidate.ts`) |
| Types TS | `src/types/api.ts` (`CreateOrderResponse`, `ApiErrorBody`, …) |

### Limiteur de débit (routes publiques en écriture)

Adossé à PostgreSQL (`RateLimitBucket`, partagé entre instances Vercel), par IP (hachée), fenêtre fixe. **Échec ouvert** : si le limiteur plante, la requête passe.
Réponse : **429** `{ error: "… Merci de réessayer dans N minutes.", retryAfter }` + en-têtes `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`.

| Portée | Limite | Compté |
|---|---|---|
| `POST /api/orders` | 10 / 10 min / IP | après validation (une faute de saisie ne consomme pas le quota) |
| `POST /api/ambassador-applications` | 5 / h / IP | après validation, hors pot de miel |
| `POST /api/newsletter` | 10 / h / IP | après validation, hors pot de miel |
| `POST /api/stock-alerts` | 10 / h / IP | après validation, hors pot de miel |
| `GET /api/checkout/status`, `POST /api/checkout/cancel` | 60 / 10 min / IP | après validation de l'identifiant de session |
| Connexion admin | 30 tentatives / 15 min / IP **et** 5 échecs / 15 min par couple e-mail+IP (blocage 15 min) | chaque tentative |

---

## Routes publiques

### `GET /api/health`
Sonde de monitoring. Aucune donnée sensible, `no-store`.
- 200 `{ "status": "ok", "db": "ok", "time": "2026-09-23T14:00:00.000Z" }`
- 503 `{ "status": "degraded", "db": "down", "time": "…" }` (base injoignable ou > 3 s)

### `POST /api/orders` — créer une commande
Corps :
```json
{
  "email": "client@example.com",
  "items": [{ "slug": "or-solaire", "volume": "50 ml", "quantity": 1 }],
  "deliveryAddress": {
    "firstName": "Camille", "lastName": "Martin",
    "address": "12 rue de la Paix", "address2": "Bât. B (optionnel)",
    "postalCode": "75002", "city": "Paris", "country": "France",
    "phone": "+33 6 12 34 56 78 (optionnel)"
  }
}
```
- `items[].name`, `image`, `price` sont **acceptés mais ignorés** (prix et nom relus en base).
- 1 à 30 lignes ; lignes identiques (slug + contenance) **fusionnées** ; quantité entière 1–10 par article (après fusion).
- Code postal : 5 chiffres si pays = France/FR, sinon 2–10 caractères alphanumériques. Téléphone : 6–15 chiffres. `country` vaut `France` par défaut.
- Livraison : 5,90 € si sous-total < 50 €, offerte à partir de 50 € (`src/lib/shipping.ts`).
- Stock décrémenté de façon atomique à la commande ; la commande est `PENDING` / `UNPAID` jusqu'à confirmation du paiement par Stripe.
- **Moyen de paiement unique** : carte bancaire via **Stripe Checkout** (voir « Paiement par carte (Stripe) » ci-dessous). Sans `STRIPE_SECRET_KEY` valide, aucune commande n'est créée (503).

Réponses :
- **201**
```json
{
  "order": {
    "id": "cm…", "reference": "JAE-7K3P9Q", "email": "client@example.com",
    "subtotal": 2500, "subtotalAmount": 2500, "shippingAmount": 590, "totalAmount": 3090,
    "currency": "eur", "status": "PENDING", "paymentStatus": "UNPAID",
    "deliveryAddress": { "...": "..." },
    "items": [{ "id": "…", "productId": "…", "name": "Or Solaire", "volume": "50 ml", "quantity": 1, "price": 2500 }],
    "createdAt": "…", "updatedAt": "…"
  },
  "payment": {
    "method": "stripe", "url": "https://checkout.stripe.com/c/pay/cs_live_…",
    "sessionId": "cs_live_…", "reference": "JAE-7K3P9Q", "amount": 3090,
    "expiresAt": "2026-10-30T12:35:00.000Z"
  }
}
```
  Le client est redirigé vers `payment.url` (page de paiement Stripe).
  La référence (`JAE-` + 6 caractères sans 0/O/1/I/L) est unique et affichée sur la page Stripe.
- **422** validation — `error` = premier message lisible (ex. `Le code postal doit comporter 5 chiffres.`), `fields` détaillé.
- **409** `code: "UNAVAILABLE"` (produit/contenance inexistant ou inactif) ou `code: "OUT_OF_STOCK"` avec `item: { slug, volume, available }` (ex. `Stock insuffisant pour Or Solaire · 50 ml : 1 disponible.`).
- **429** limiteur.
- **502** `code: "PAYMENT_UNAVAILABLE"` : Stripe injoignable ; la commande est annulée aussitôt et le stock restitué (le panier du client est conservé).
- **503** `code: "PAYMENT_UNAVAILABLE"` : paiement par carte non configuré (`STRIPE_SECRET_KEY` absente ou invalide) ; rien n'est enregistré.

### Paiement par carte (Stripe)

Parcours : `POST /api/orders` → session **Stripe Checkout** (page hébergée, moyens de paiement dynamiques réglés dans le Dashboard, prix TTC `tax_behavior: inclusive`) → retour sur `/panier?etape=confirmation&session_id={CHECKOUT_SESSION_ID}` (paiement) ou `/panier?etape=livraison&paiement=annule` (abandon). Code : `src/lib/stripe.ts`, `src/lib/stripe-checkout.ts`.

- Le stock est réservé **35 minutes** (`expires_at` de la session) ; passé ce délai la session expire et la commande est annulée, stock restitué.
- La commande n'est marquée payée que sur **preuve Stripe** : webhook signé, ou session relue côté serveur au retour du client. Toutes les transitions sont idempotentes (verrou `FOR UPDATE`).
- Paiement reçu pour une commande annulée entre-temps : remboursement intégral automatique.
- Filet de sécurité : après chaque commande, les paiements restés en attente au-delà de la session sont resynchronisés auprès de Stripe (webhook manqué).

#### `POST /api/stripe/webhook`
Endpoint à déclarer dans Dashboard › Développeurs › Webhooks : `https://jaeparis.com/api/stripe/webhook`, événements
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
Signature vérifiée sur le corps brut (`STRIPE_WEBHOOK_SECRET`).
- 200 `{ received: true, result }` · 400 signature absente/invalide · 413 · 500 traitement en échec (Stripe renverra l'événement) · 503 Stripe non configuré.

| Événement | Effet |
|---|---|
| `checkout.session.completed` (`payment_status: paid`) / `async_payment_succeeded` | `UNPAID → PAID`, `PENDING → CONFIRMED`, PaymentIntent enregistré |
| `checkout.session.completed` (`payment_status: unpaid`, paiement différé) | aucun (stock toujours réservé) |
| `checkout.session.async_payment_failed` | `CANCELLED` / `FAILED`, stock restitué |
| `checkout.session.expired` | `CANCELLED`, stock restitué |

#### `GET /api/checkout/status?session_id=cs_…`
État du paiement au retour de Stripe (relit la session si la commande est encore en attente). L'identifiant de session sert de clé d'accès.
- 200 `{ state: "paid"|"processing"|"open"|"cancelled", paymentUrl, order: { reference, email, firstName, subtotal, shippingAmount, totalAmount, createdAt, items } }` · 404 · 422 · 429

#### `POST /api/checkout/cancel`
Corps : `{ sessionId }`. Ferme la session Stripe encore ouverte puis annule la commande (stock restitué) ; si le paiement a abouti entre-temps, il est enregistré à la place. Origine étrangère → 403.
- 200 `{ state }` · 403 · 404 · 422 · 429 · 502 (Stripe injoignable) · 503 (Stripe non configuré)

### `POST /api/ambassador-applications` — candidature « Devenir ambassadrice »
Corps : `{ firstName (1–60), lastName (1–60), email, phone?, instagram?, city?, message (20–2000), website? }` (`website` = pot de miel : s'il est rempli, 201 sans enregistrement).
- 201 `{ "ok": true }` · 422 `{ error: "Merci de vérifier les champs du formulaire.", fields }` · 429

### `POST /api/newsletter` — inscription au Cercle JAE
Corps : `{ email, website? }`. Idempotent (adresse déjà inscrite → 201).
- 201 `{ "ok": true }` · 422 `{ error: "Adresse e-mail invalide.", fields }` · 429

### `POST /api/stock-alerts` — « M'avertir du retour »
Corps : `{ email, slug, volume (1–32), website? }`. Uniquement pour une contenance **épuisée** d'un produit publié. Idempotent (même e-mail, produit et contenance → 201, alerte réarmée). Requête dont l'en-tête `Origin` désigne un autre site → 403.
- 201 `{ "ok": true }` · 403 · 404 (produit ou contenance inconnus) · 409 (contenance de nouveau en stock) · 422 · 429

### `GET /api/articles`
Articles publiés : `{ articles: [{ id, title, slug, excerpt, coverImage, publishedAt }] }`.

### `GET /api/media/[id]`
Image téléversée (public). En-têtes : `Content-Type` (type réel), `Cache-Control: public, max-age=31536000, immutable`, `ETag: "<id>"`, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`. `If-None-Match` → 304. Inconnu/malformé → 404 JSON.

### `/api/auth/*` (Auth.js)
- `GET /api/auth/csrf` → `{ csrfToken }`
- `POST /api/auth/callback/credentials` (form-urlencoded : `email`, `password`, `csrfToken`, `callbackUrl`) → cookie de session (8 h). Échec → `url` contenant `error=CredentialsSignin`.
- `GET /api/auth/session` → `{ user: { id, name, email, role }, expires }` ou `null` (compte désactivé → `null` + cookie supprimé).
- `POST /api/auth/signout` (`csrfToken`) → supprime le cookie.

---

## Routes admin (session ADMIN ou EDITOR requise)

Toutes : 401 `{ error: "Non autorisé." }` sans session valide.

### Produits
| Méthode & route | Corps | Réponses |
|---|---|---|
| `GET /api/admin/products` | — | 200 `{ products: Product[] }` (avec `variants`) |
| `POST /api/admin/products` | `ProductInput` | 201 `{ product }` · 422 · 409 (slug/SKU déjà utilisé) |
| `GET /api/admin/products/[id]` | — | 200 `{ product }` · 404 |
| `PUT /api/admin/products/[id]` | `ProductInput` (remplace tout, variantes comprises) | 200 `{ product }` · 404 · 409 · 422 |
| `PATCH /api/admin/products/[id]` | `{ isActive: boolean }` | 200 `{ product }` · 404 · 422 |
| `DELETE /api/admin/products/[id]` | — | 204 · 403 (EDITOR) · 404 · 409 `code: "PRODUCT_HAS_ORDERS"` (dépublier à la place) |

`ProductInput` : `{ name (2–120), slug (a-z0-9-), category: "PARFUM"|"ACCESSOIRE", description (10–2000), story (10–10000), images: string[1–12] (chemin "/…" ou URL http(s)), notesTop/notesHeart/notesBase: string[≤12], tagline? (≤140), family? (≤80), moment? (≤60), hour? ("HH:MM"), hourFrom? ("HH:MM", exige hour), palette? (soleil|poudre|grenat|lilas|sauge|ambre|encre|or), isActive, variants: [{ sku (A-Z0-9_-), volume, price, stock, isActive }] (1–12, SKU et contenances uniques) }`.
« Les Heures » : `hour` est l'heure signature affichée ; le parfum est « l'heure de » à partir de `hourFrom` (à défaut `hour`) jusqu'au début du créneau suivant. Ces champs sont ignorés pour un accessoire.
Revalide : layout public, `/`, `/boutique`, `/accessoires`, `/recherche`, `/produit/<slug>` (+ ancien slug), `/sitemap.xml`, `/admin`, `/admin/produits[/id]`.

### Articles (Journal)
| Méthode & route | Corps | Réponses |
|---|---|---|
| `GET /api/admin/articles` | — | 200 `{ articles }` |
| `POST /api/admin/articles` | `{ title, slug, excerpt (10–500), content (10–50000), coverImage, isPublished }` | 201 `{ article }` · 409 slug · 422 |
| `GET /api/admin/articles/[id]` | — | 200 `{ article }` · 404 |
| `PUT /api/admin/articles/[id]` | idem POST | 200 · 404 · 409 · 422 |
| `PATCH /api/admin/articles/[id]` | `{ isPublished }` | 200 · 404 · 422 |
| `DELETE /api/admin/articles/[id]` | — | 204 · 404 |

La date de première publication (`publishedAt`) est conservée lors des modifications et republications. Revalide `/`, `/journal`, `/journal/<slug>` (+ ancien), `/sitemap.xml`, `/admin/articles`.

### Ambassadrices / Boutiques
| Méthode & route | Corps | Réponses |
|---|---|---|
| `GET /api/admin/ambassadors` · `/api/admin/stores` | — | 200 `{ ambassadors }` · `{ stores }` |
| `POST …` | `AmbassadorInput` · `StoreInput` | 201 `{ ambassador }` · `{ store }` · 422 |
| `GET …/[id]` | — | 200 · 404 |
| `PUT …/[id]` | idem POST | 200 · 404 · 422 |
| `PATCH …/[id]` | `{ isActive }` | 200 · 404 · 422 |
| `DELETE …/[id]` | — | 204 · 404 |

`AmbassadorInput` : `{ name (2–80), role (≤80), photo (image), description (10–600), instagram?, isActive, sortOrder (0–9999) }`.
`StoreInput` : `{ name, address, city, country, phone?, openingHours, image, isActive, sortOrder }`.
Revalide `/ambassadrices` ou `/boutiques`, `/` et la page admin correspondante.

### Candidatures
| Méthode & route | Réponses |
|---|---|
| `GET /api/admin/applications?status=NEW\|CONTACTED\|ACCEPTED\|REJECTED\|all` | 200 `{ applications }` · 422 statut inconnu |
| `GET /api/admin/applications?format=csv[&status=…]` | 200 `text/csv` (voir CSV) |
| `PATCH /api/admin/applications/[id]` `{ status }` | 200 `{ application }` · 404 · 422 |
| `DELETE /api/admin/applications/[id]` | 204 · 404 |

### Newsletter
| Méthode & route | Réponses |
|---|---|
| `GET /api/admin/newsletter` | 200 `{ subscribers: [{ id, email, createdAt }] }` |
| `GET /api/admin/newsletter?format=csv` | 200 `text/csv` |
| `DELETE /api/admin/newsletter/[id]` | 204 · 404 |

**CSV** : UTF-8 avec BOM, séparateur `;` (Excel FR ; Google Sheets le détecte), RFC 4180 (guillemets doublés, champs multi-lignes), cellules commençant par `= + - @` tabulation ou retour chariot préfixées d'une apostrophe (anti-injection de formules), `Content-Disposition: attachment; filename="…-AAAA-MM-JJ.csv"`. Lien direct utilisable : `<a href="/api/admin/newsletter?format=csv" download>`.

### Alertes retour
| Méthode & route | Corps | Réponses |
|---|---|---|
| `GET /api/admin/stock-alerts` | — | 200 `{ alerts: [{ id, email, volume, stock, createdAt, notifiedAt, product: { id, name, slug } }] }` (`stock` = stock actuel de la contenance) |
| `GET /api/admin/stock-alerts?format=csv` | — | 200 `text/csv` |
| `PATCH /api/admin/stock-alerts/[id]` | `{ notified: boolean }` | 200 `{ alert }` · 404 · 422 |
| `DELETE /api/admin/stock-alerts/[id]` | — | 204 · 404 |

### Commandes
| Méthode & route | Corps | Réponses |
|---|---|---|
| `GET /api/admin/orders?status=…&paymentStatus=…` | — | 200 `{ orders }` (chaque commande avec `reference`, `subtotal`, `shippingAmount`, `totalAmount`, `items`, `user`) · 422 filtre inconnu |
| `GET /api/admin/orders/[id]` | — | 200 `{ order }` · 404 |
| `PATCH /api/admin/orders/[id]` | `{ action: "confirm-payment" }` · `{ action: "cancel" }` · `{ action: "set-status", status: "CONFIRMED"\|"PREPARING"\|"SHIPPED"\|"DELIVERED" }` | 200 `{ order }` · 404 · 409 · 422 |

Transitions (la ligne est verrouillée `FOR UPDATE` : doubles clics sans effet) :
- `confirm-payment` : `UNPAID → PAID`, `PENDING → CONFIRMED`. Idempotent. Commande annulée → 409 `ORDER_NOT_CONFIRMABLE`.
- `set-status` : exige `PAID` (sinon 409 `PAYMENT_REQUIRED`) ; interdit sur commande annulée (409 `ORDER_CANCELLED`) ; retour arrière permis entre statuts de préparation.
- `cancel` : restitue le stock (une seule fois, idempotent), `PAID → REFUNDED`. Commande livrée → 409 `ORDER_DELIVERED`. Commande par carte : la session Stripe encore ouverte est d'abord fermée, et un paiement encaissé est **remboursé automatiquement** via Stripe avant l'annulation (échec → 502 `REFUND_FAILED`, commande inchangée).
- `confirm-payment` est réservé aux anciennes commandes Lydia (antérieures au paiement par carte) : sur une commande par carte → 409 `CARD_PAYMENT`, seul Stripe confirme un paiement.

### Médias
| Méthode & route | Corps | Réponses |
|---|---|---|
| `GET /api/admin/media` | — | 200 `{ assets: [{ id, filename, mimeType, size, createdAt, url }] }` |
| `POST /api/admin/media` | `multipart/form-data`, champ `file` | 201 `{ asset: { …, url: "/api/media/<id>" } }` · 413 (> 4 Mo) · 415 (pas une image JPEG/PNG/WebP/GIF/AVIF d'après sa signature binaire : SVG, HTML, faux PNG…) · 422 (aucun fichier / vide) |
| `GET /api/admin/media/[id]` | — | 200 `{ asset, usages: MediaUsage[] }` · 404 |
| `DELETE /api/admin/media/[id][?force=1]` | — | 204 · 404 · 409 `{ error: "Ce média est encore utilisé : Produit « … », …", code: "MEDIA_IN_USE", usages: [{ type, id, label, adminUrl }] }` |

Le type MIME stocké est celui **détecté** (magic bytes), le nom de fichier est assaini (sans chemin ni caractères spéciaux, extension cohérente). Usages détectés : images produit, couverture/contenu d'article, réglages d'apparence, photo d'ambassadrice, image de boutique.

### Réglages (images du site)
| Méthode & route | Corps | Réponses |
|---|---|---|
| `GET /api/admin/settings` | — | 200 `{ images: { "home.campaign.image": "…", … }, slots: IMAGE_SLOTS }` |
| `PUT /api/admin/settings` | `{ key: <IMAGE_SLOTS.key>, value: "<image>" \| "" }` (`""` = image d'origine) | 200 `{ images }` · 422 |

Revalide tout l'arbre public (`revalidatePath("/", "layout")`) et `/admin/apparence`.

---

## Pages techniques
- `GET /sitemap.xml` : pages statiques + produits actifs ayant au moins une contenance active + articles publiés, `lastmod` = `updatedAt`. Base indisponible → pages statiques seules.
- `GET /robots.txt` : `Disallow` `/admin`, `/api/` (sauf `/api/media/`), `/connexion-admin`, `/panier`, `/compte` ; `Sitemap:` absolu (`NEXT_PUBLIC_SITE_URL`, sinon URL de production Vercel). Déploiement de prévisualisation Vercel → `Disallow: /`.

## Tests
```bash
npx next dev -p 3001            # serveur
npm run test:api                # 57 vérifications (BASE_URL=… pour une autre cible)
npm run test:auth && npm run test:crud
```
