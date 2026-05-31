# CONTEXT.md — ImmoSafe MVP
> Ce fichier est le document de référence absolu du projet. À lire intégralement avant toute implémentation.
> Optimisé pour Claude Code. Ne jamais dévier des décisions d'architecture sans validation explicite.

---

## 1. VISION PRODUIT

### Ce qu'est ImmoSafe
ImmoSafe est une application web d'accompagnement à l'achat immobilier pour les primo-accédants français (25-35 ans). Elle permet à quelqu'un qui ne connaît **rien** à l'immobilier de savoir en moins de 60 secondes si une annonce est une bonne affaire, à quel prix négocier, et quoi vérifier lors de la visite.

### Ce qu'elle n'est pas
- Ce n'est pas un agrégateur d'annonces (on analyse, on ne liste pas)
- Ce n'est pas un outil pour investisseurs locatifs
- Ce n'est pas un agent immobilier numérique

### La promesse core
> "Tu colles une annonce. On te dit si c'est un bon plan, pourquoi, et quoi faire."

### Problème résolu
Les primo-accédants se retrouvent seuls face à un marché opaque, avec pour seul recours des agents immobiliers dont l'intérêt premier est de vendre. ImmoSafe est le seul outil 100% du côté de l'acheteur, sans conflit d'intérêt.

---

## 2. PHILOSOPHIE UX — LA RÈGLE DES CLICS

### Règle absolue
**Toute action principale doit être accomplie en 3 clics maximum depuis la page d'accueil.**

### Règles UX non négociables
1. **Zéro jargon sans explication** — Chaque terme technique (DPE, DVF, copropriété...) est hoverable/cliquable et affiche une définition en langage courant dans un tooltip ou modal léger.
2. **Toujours un verdict clair** — Jamais de données brutes sans interprétation. Toujours une phrase humaine qui dit quoi penser de la donnée.
3. **Progressive disclosure** — L'info importante est visible immédiatement. Les détails sont un niveau en dessous, jamais imposés.
4. **Feedback instantané** — Chaque action utilisateur doit déclencher un retour visuel en moins de 100ms (loading states, skeleton screens, transitions).
5. **Formulaires au minimum** — Si une donnée peut être inférée ou récupérée automatiquement, elle ne doit jamais être demandée à l'user.
6. **Mobile-first** — L'app est web mais doit être parfaitement utilisable sur smartphone. Tout doit fonctionner au pouce, actions principales accessibles sans scroll.

### Parcours utilisateur cible — analyse d'un bien

```
Page d'accueil
    ↓ [1 clic] Bouton "Analyser un bien"
Page analyse
    ↓ [paste URL ou clic "Remplir manuellement"]
    ↓ [1 clic] Bouton "Lancer l'analyse"
Loading (animation immersive, ~8 secondes)
    ↓
Page résultat — Score ImmoSafe + synthèse complète
```

**Total : 2 clics + 1 paste pour avoir un résultat complet.**

---

## 3. STACK TECHNIQUE

### Monorepo
```
turborepo (gestionnaire de monorepo)
immosafe/
├── apps/
│   ├── api/             → Node.js + Express (backend)
│   └── web/             → Next.js 15 App Router (frontend)
├── packages/
│   └── shared-types/    → Types TypeScript partagés api + web
├── turbo.json
├── package.json         → workspaces
└── .env                 → variables d'environnement
```

### Déploiement
- **Provider** : Coolify sur VPS
- **Un seul repo GitHub** → deux services Coolify configurés :
  - Service 1 : root directory = `apps/api/`
  - Service 2 : root directory = `apps/web/`
- Chaque push sur `main` déclenche les deux déploiements

### Frontend — apps/web/
- **Framework** : Next.js 15 (App Router)
- **Langage** : TypeScript strict
- **Styling** : Tailwind CSS v4
- **UI Components** : shadcn/ui — NE PAS utiliser d'autre lib UI
- **State global** : Zustand
- **Requêtes API** : TanStack Query v5
- **Formulaires** : React Hook Form + Zod
- **Animations** : Framer Motion
- **Carte** : Mapbox GL JS (réservé V2, ne pas implémenter en MVP)
- **Icons** : Lucide React

### Backend — apps/api/
- **Runtime** : Node.js 20 LTS
- **Framework** : Express 5
- **Langage** : TypeScript strict
- **Validation** : Zod (schémas partagés avec le web via shared-types)
- **ORM** : Prisma
- **BDD** : PostgreSQL (via Supabase)
- **Auth** : JWT — access token 15min + refresh token 30j en httpOnly cookie
- **PDF** : pdf-lib
- **Scraping** : Puppeteer (avec fallback formulaire manuel si échec)
- **Logging** : Pino
- **Tests** : Vitest

### Base de données
- **Provider** : Supabase (PostgreSQL 15)
- **Migrations** : Prisma Migrate
- **Storage fichiers** : Supabase Storage (PDFs générés)

### IA
- **Provider** : Anthropic Claude API
- **Modèle** : claude-sonnet-4-20250514
- **Prompts** : versionnés dans `prompts/*.txt`, jamais hardcodés dans le code
- **Parsing réponse** : toujours JSON strict via system prompt, validé avec Zod

### Paiement
- **Provider** : Stripe
- **Plans** : 1 seul plan en MVP — 29€ / 3 mois
- **Gestion webhooks** : endpoint dédié `/webhooks/stripe`

---

## 4. SCHÉMA BASE DE DONNÉES

```prisma
model User {
  id                String         @id @default(cuid())
  email             String         @unique
  passwordHash      String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  subscription      Subscription?
  biens             Bien[]
  freeAnalysisUsed  Boolean        @default(false)
}

model Subscription {
  id                    String             @id @default(cuid())
  userId                String             @unique
  user                  User               @relation(fields: [userId], references: [id])
  stripeCustomerId      String             @unique
  stripeSubscriptionId  String             @unique
  status                SubscriptionStatus
  currentPeriodEnd      DateTime
  createdAt             DateTime           @default(now())
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
}

model Bien {
  id                String      @id @default(cuid())
  userId            String?
  user              User?       @relation(fields: [userId], references: [id])

  // Données brutes annonce
  urlSource         String?
  titre             String?
  prix              Int
  surface           Float
  typeBien          TypeBien
  nbPieces          Int?
  ville             String
  codePostal        String
  adresse           String?
  latitude          Float?
  longitude         Float?
  dpe               String?
  charges           Int?
  anneeConstruction Int?

  // Données enrichies
  prixM2Bien        Float?
  prixM2Marche      Float?
  historiqueAnnonce Json?
  joursEnLigne      Int?

  // Résultat analyse IA
  scoreImmoSafe     Int?
  analyse           Json?

  // Metadata
  statut            BienStatut  @default(EN_COURS)
  isFavorite        Boolean     @default(false)
  rapport           Rapport?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

enum TypeBien {
  APPARTEMENT
  MAISON
  STUDIO
}

enum BienStatut {
  EN_COURS
  VISITE_PLANIFIEE
  OFFRE_FAITE
  ABANDONNE
}

model Rapport {
  id        String   @id @default(cuid())
  bienId    String   @unique
  bien      Bien     @relation(fields: [bienId], references: [id])
  fileUrl   String
  createdAt DateTime @default(now())
}
```

---

## 5. ENDPOINTS API — SPEC COMPLÈTE

### Auth
```
POST   /api/auth/register
       body: { email, password }
       return: { user, accessToken } + set refreshToken cookie httpOnly

POST   /api/auth/login
       body: { email, password }
       return: { user, accessToken } + set refreshToken cookie httpOnly

POST   /api/auth/refresh
       cookie: refreshToken
       return: { accessToken }

POST   /api/auth/logout
       → clear refreshToken cookie
```

### Biens
```
POST   /api/biens/analyser
       auth: optionnel (1 analyse gratuite sans compte)
       body: { url? } | { formulaire: BienFormulaire }
       return: { bienId, scoreImmoSafe, analyse }

GET    /api/biens
       auth: required
       return: [{ id, titre, ville, prix, scoreImmoSafe, isFavorite, statut, createdAt }]

GET    /api/biens/:id
       auth: required
       return: Bien complet avec analyse

PATCH  /api/biens/:id
       auth: required
       body: { isFavorite?, statut? }

DELETE /api/biens/:id
       auth: required
```

### Rapports
```
POST   /api/rapports/generer/:bienId
       auth: required + subscription active
       return: { rapportId, fileUrl }

GET    /api/rapports/:id/download
       auth: required
       return: redirect vers URL signée Supabase Storage (24h)
```

### Subscription
```
POST   /api/subscription/create-checkout
       auth: required
       return: { checkoutUrl }

GET    /api/subscription/status
       auth: required
       return: { isActive, currentPeriodEnd }
```

### Webhooks
```
POST   /api/webhooks/stripe
       → Events: checkout.session.completed
                 customer.subscription.deleted
                 invoice.payment_failed
```

---

## 6. PIPELINE D'ANALYSE — CŒUR DU PRODUIT

```
POST /api/biens/analyser reçoit { url } ou { formulaire }
              ↓
[STEP 1] PARSING
  Si url fournie → Puppeteer parse l'annonce
    Extraire: prix, surface, ville, DPE, charges, description
    Si echec → retourner { needsManualInput: true, partialData }
  Si formulaire → utiliser directement les données

              ↓
[STEP 2] ENRICHISSEMENT (appels parallèles via Promise.all)
  → Géocoding: adresse → lat/lon (api-adresse.data.gouv.fr)
  → DVF API: prix transactions rayon 500m, 24 derniers mois
  → ADEME API: données DPE si adresse connue
  → Calcul jours en ligne si URL disponible

              ↓
[STEP 3] CONSTRUCTION CONTEXTE IA
  → Assembler objet AnalyseContext (voir section 7)

              ↓
[STEP 4] APPEL CLAUDE API
  → System prompt: prompts/analyse-bien.txt
  → User message: JSON.stringify(analyseContext)
  → Valider réponse avec Zod schema AnalyseResult

              ↓
[STEP 5] SAUVEGARDE + RETOUR
  → Créer Bien en BDD avec tous les résultats
  → Associer userId si authentifié
  → Retourner AnalyseResult au client

Objectif performance: pipeline complet < 10 secondes
```

---

## 7. TYPES PARTAGÉS (packages/shared-types)

```typescript
export interface AnalyseContext {
  bien: {
    prix: number
    surface: number
    typeBien: 'APPARTEMENT' | 'MAISON' | 'STUDIO'
    nbPieces?: number
    ville: string
    codePostal: string
    adresse?: string
    dpe?: string
    charges?: number
    anneeConstruction?: number
    description?: string
    joursEnLigne?: number
    historiqueAnnonce?: Array<{ date: string; prix: number }>
  }
  marche: {
    prixM2MoyenQuartier: number
    prixM2Min: number
    prixM2Max: number
    nbTransactions: number
    evolutionPrix1an?: number
    transactionsRecentes: Array<{
      prix: number
      surface: number
      date: string
    }>
  }
}

export interface AnalyseResult {
  scoreImmoSafe: number           // 0-100

  prixAnalyse: {
    prixM2Bien: number
    prixM2Marche: number
    ecartPourcentage: number      // positif = surévalué
    phraseVerdict: string
  }

  dpeAnalyse?: {
    classe: string
    surcoutMensuelEstime: number
    interdictionLocation2028: boolean
    phraseImpact: string
  }

  negociation: {
    margeEstimee: number
    prixCibleMin: number
    prixCibleMax: number
    phraseActionnable: string
    argumentsNegociation: string[]
  }

  pointsVigilance: Array<{
    niveau: 'INFO' | 'ATTENTION' | 'CRITIQUE'
    titre: string
    explication: string
  }>

  questionsVendeur: Array<{
    question: string
    pourquoi: string
  }>

  syntheseTexte: string
}

export interface BienFormulaire {
  prix: number
  surface: number
  typeBien: 'APPARTEMENT' | 'MAISON' | 'STUDIO'
  nbPieces?: number
  ville: string
  codePostal: string
  dpe?: string
  charges?: number
  anneeConstruction?: number
}
```

---

## 8. STRUCTURE DES PAGES (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)/
│   ├── layout.tsx           → Layout principal + nav
│   ├── page.tsx             → Dashboard accueil
│   ├── analyser/page.tsx    → Formulaire d'analyse
│   ├── biens/
│   │   ├── page.tsx         → Liste biens sauvegardés
│   │   └── [id]/page.tsx    → Résultat analyse détaillé
│   └── profil/page.tsx      → Profil + abonnement
├── layout.tsx               → Root layout + providers
└── globals.css
```

### Règle d'or
Chaque page a UN seul objectif. Pas de feature creep.
- `page.tsx` → CTA analyser + 3 dernières analyses
- `analyser/page.tsx` → Collecter les infos, rien d'autre
- `biens/[id]/page.tsx` → Afficher le résultat, rien d'autre

---

## 9. COMPOSANTS UI CLÉS

```
ScoreGauge          → Jauge circulaire animée 0-100
                      Vert (70-100) Orange (40-69) Rouge (0-39)

VerdictCard         → Card hero: score + phraseVerdict
                      Premier élément visible page résultat

PrixComparison      → Barre visuelle prix bien vs marché + diff €

DPEBadge            → Badge coloré classe + surcoût €/mois
                      Hover → tooltip explication simple

PointVigilanceItem  → Icône niveau + titre + explication expandable

QuestionCard        → Question + bouton "Copier" en 1 clic

NegociationBlock    → Fourchette prix + phrase actionnable en gras

BienCard            → Card liste: score + ville + prix + statut

LoadingAnalyse      → Animation ~8s avec steps progressifs:
                      "Récupération des données du marché..."
                      "Analyse du prix au m²..."
                      "Génération de votre rapport..."

JargonTooltip       → Wrapper sur termes techniques
                      Hover desktop / tap mobile → définition simple
```

---

## 10. GESTION DES ERREURS

- Jamais d'erreur technique visible. Toujours un message humain.
- Si parsing URL échoue → transition fluide vers formulaire manuel.
- Si DVF ne répond pas → continuer, mention "Données de marché partielles".
- Si Claude API timeout → retry 1 fois automatiquement.
- Timeout max sur tous les appels externes : 8 secondes.

---

## 11. SÉCURITÉ

- Tous les secrets en variables d'environnement, jamais dans le code
- Rate limiting : 5 req/min IP non auth, 20 req/min user auth sur /analyser
- Validation Zod sur TOUS les inputs sans exception
- Analyse gratuite : limitée par IP + fingerprint navigateur
- PDFs : URLs signées Supabase expiration 24h
- Webhook Stripe : vérification signature obligatoire
- CORS : whitelist domaine web uniquement

---

## 12. VARIABLES D'ENVIRONNEMENT

```env
# API (apps/api/)
NODE_ENV=
PORT=3000
DATABASE_URL=
DIRECT_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
WEB_URL=

# Web (apps/web/)
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## 13. SOURCES DE DONNÉES

### DVF
```
Géocoding:
  GET https://api-adresse.data.gouv.fr/search/?q={adresse}&limit=1

Transactions:
  GET https://api.cquest.org/dvf?lat={lat}&lon={lon}&dist=500&nature_mutation=Vente
  Filtrer: 24 derniers mois, même type bien, surface ± 30%
  Calculer: prixM2Moyen, prixM2Min, prixM2Max, nbTransactions
```

### ADEME DPE
```
GET https://data.ademe.fr/data-fair/api/v1/datasets/
    dpe-v2-logements-existants/lines?q={adresse}&size=1
Utiliser si adresse précise connue, sinon utiliser DPE du formulaire.
```

---

## 14. PROMPTS

```
prompts/
├── analyse-bien.txt     → System prompt analyse complète
└── README.md            → Convention versioning
```

Règles :
- Réponse JSON strict uniquement, zéro texte hors JSON
- Version en première ligne commentée
- Jamais hardcodé dans le code source

---

## 15. ORDRE D'IMPLÉMENTATION MVP

Implémenter STRICTEMENT dans cet ordre.

```
PHASE 1 — Fondations
  [ ] Setup Turborepo monorepo
  [ ] Init Next.js 15 dans apps/web/
  [ ] Init Express dans apps/api/
  [ ] Setup shared-types package
  [ ] Prisma schema + migration Supabase
  [ ] Auth complet API (register/login/refresh/logout)
  [ ] Auth côté web (context, guards, pages login/register)

PHASE 2 — Core Pipeline
  [ ] Intégration DVF API + géocoding
  [ ] Intégration ADEME DPE API
  [ ] Prompt Claude + validation Zod
  [ ] Endpoint POST /api/biens/analyser (formulaire manuel)
  [ ] Sauvegarde résultat BDD

PHASE 3 — Web Core
  [ ] Page analyser (formulaire manuel)
  [ ] Animation loading
  [ ] Page résultat biens/[id] avec tous les composants
  [ ] Page liste biens
  [ ] Dashboard accueil

PHASE 4 — Monétisation
  [ ] Stripe checkout + webhooks
  [ ] Gate analyses (1 gratuite puis abonnement)
  [ ] Page profil + statut abonnement

PHASE 5 — Polish MVP
  [ ] Génération PDF rapport
  [ ] Scraping URL Puppeteer (bonus)
  [ ] Gestion erreurs complète
  [ ] Tests pipeline + auth + paiement
  [ ] Config Coolify + déploiement
```

---

## 16. CE QU'IL NE FAUT PAS FAIRE

- ❌ Afficher un chiffre brut sans contexte ni interprétation
- ❌ Bloquer l'user sur une erreur sans solution de contournement
- ❌ Implémenter une feature V2 (carte, comparateur, alertes, isochrones)
- ❌ Hardcoder les prompts dans le code source
- ❌ Appeler Claude sans valider la réponse avec Zod
- ❌ Utiliser une autre lib UI que shadcn/ui
- ❌ Implémenter Puppeteer avant que le formulaire manuel fonctionne

---

*Version 1.1 — Mai 2026 — Stack web Next.js 15 + Express sur monorepo Turborepo*
