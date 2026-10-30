# JAE Paris — E-commerce

Boutique premium JAE Paris : expérience publique, catalogue, fiches produit, panier, commandes avec suivi de stock, back-office sécurisé et modèle PostgreSQL/Prisma.

## Démarrer en local

Prérequis : Node.js 20+ et Docker Desktop (ou une instance PostgreSQL 16).

```bash
# 1. Copier et configurer les variables d'environnement
cp .env.example .env
# Éditez .env avec vos secrets (AUTH_SECRET, ADMIN_PASSWORD, etc.)

# 2. Installer les dépendances
npm install

# 3. Démarrer PostgreSQL
npm run docker:up
# ou : docker compose up -d postgres

# 4. Appliquer les migrations et seed
npx prisma migrate deploy
npm run db:seed

# 5. Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Déploiement en production

```bash
# Build Docker
npm run docker:build

# Démarrer la stack complète
npm run docker:up

# Première initialisation (migration + seed)
docker exec -it jae-paris-app npx prisma migrate deploy
docker exec -it jae-paris-app npx tsx prisma/seed.ts
```

### Paiement par carte (Stripe)

1. Dashboard Stripe › Développeurs › Clés API : créez de préférence une **clé restreinte** (`rk_live_…`) avec les droits *Checkout Sessions* (écriture), *PaymentIntents* (lecture) et *Refunds* (écriture), et renseignez-la dans `STRIPE_SECRET_KEY` (Vercel › Settings › Environment Variables, environnement *Production*).
2. Dashboard › Développeurs › Webhooks : ajoutez l'endpoint `https://jaeparis.com/api/stripe/webhook` avec les événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, puis copiez son secret de signature dans `STRIPE_WEBHOOK_SECRET`.
3. Moyens de paiement : Dashboard › Paramètres › Moyens de paiement (carte bancaire, Apple Pay, Google Pay…). Le site ne fixe aucune liste.
4. TVA (Stripe Tax, facultatif) : renseignez l'adresse du siège et vos immatriculations dans Dashboard › Tax, puis `STRIPE_AUTOMATIC_TAX=true`. Les prix restent TTC (TVA incluse, jamais ajoutée). Code taxe produit : celui par défaut du compte, ou `STRIPE_TAX_CODE` (valeur `txcd_…` issue de la liste officielle Stripe).
5. Redéployez. Sans `STRIPE_SECRET_KEY`, le site garde le paiement Lydia.

Les clés de **test** (`sk_test_…`) ne doivent servir qu'en local ou en préproduction : en production, les vraies cartes seraient refusées.

## Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` | Build Next.js optimisé |
| `npm run start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm run db:migrate` | Créer une migration (dev) |
| `npm run db:migrate:prod` | Appliquer les migrations (prod) |
| `npm run db:seed` | Seed admin + produits de démonstration |
| `npm run db:studio` | GUI Prisma Studio |
| `npm run docker:build` | Build image Docker |
| `npm run docker:up` | Démarrer la stack Docker |

## Architecture

- **Framework** : Next.js 15 (App Router, React 19)
- **Styling** : Tailwind CSS v4 + PostCSS + CSS custom
- **Base de données** : PostgreSQL 16 via Prisma ORM
- **Authentification** : Auth.js (NextAuth v5) — JWT, bcrypt, rate limiting
- **Paiement** : carte bancaire via Stripe Checkout (webhook signé, stock réservé 35 min, remboursement automatique à l'annulation, Stripe Tax en option) ; repli sur le lien Lydia tant que Stripe n'est pas configuré
- **Containerisation** : Dockerfile multi-stage + docker-compose.prod.yml

## Fonctionnalités

- Direction artistique « Quelle heure êtes-vous ? » : chaque eau de parfum porte une heure de la journée ; l'heure de Paris désigne le parfum du moment (accueil, en-tête, menu, panier vide), réglette pour simuler une autre heure, frise « Les Heures » sur la collection
- Couleurs des parfums par palettes fermées (soleil, poudre, grenat…) et flacon illustré automatique tant qu'un parfum n'a pas de photo
- Quiz « Trouver mon heure » (4 questions) avec carte à partager
- Fiche parfum : pyramide olfactive, évaporation des notes dans le temps, « M'avertir du retour » sur les contenances épuisées (alertes suivies dans l'admin, export CSV)
- Les Ors (bijoux) avec lookbook administrable, Le Cercle (ambassadeurs), Journal, Lettre JAE
- Catalogue, fiches produit et choix de contenance
- Panier persistant dans le navigateur avec checkout multi-étapes
- Recherche de produits par nom et notes olfactives
- Journal, ambassadrices et boutiques
- Authentification admin par email et mot de passe hashé
- Protection du back-office (rôles `ADMIN` et `EDITOR`)
- Rate limiting : 5 tentatives par fenêtre de 15 minutes
- Tableau de bord avec CA, commandes et alertes stock
- CRUD produits complet : création, lecture, modification, publication, suppression
- Gestion de plusieurs contenances avec prix, SKU et stocks indépendants
- API commandes avec validation de stock et décrémentation automatique
- Sitemap XML et robots.txt dynamiques
- Pages d'erreur et états de chargement
- Dockerfile optimisé pour la production (standalone, non-root)

## Accès administrateur

Le seed utilise `ADMIN_EMAIL` et `ADMIN_PASSWORD` depuis `.env`.

Page de connexion : [http://localhost:3000/connexion-admin](http://localhost:3000/connexion-admin)

## Tests d'intégration

```bash
npm run test:auth
npm run test:crud
```

## Roadmap

1. Upload d'images produit (S3 / Cloudflare R2)
2. CRUD articles, commandes et ambassadrices dans l'admin
3. Intégration Stripe Checkout avec webhooks
4. Emails transactionnels (SendGrid / Resend)
5. Comptes clients (inscription, historique, adresses)

Les montants sont stockés en centimes dans la base afin d'éviter les erreurs de calcul en virgule flottante.
