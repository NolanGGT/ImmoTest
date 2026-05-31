# ImmoSafe — Guide de démarrage

## Prérequis

- Node.js >= 20.0.0
- npm >= 10.0.0
- Un projet Supabase avec une base PostgreSQL

---

## 1. Installation des dépendances

```bash
npm install
```

---

## 2. Variables d'environnement

### API (`apps/api/.env`)

Remplir les variables vides :

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
JWT_ACCESS_SECRET=<générer avec : openssl rand -base64 64>
JWT_REFRESH_SECRET=<générer avec : openssl rand -base64 64>
ANTHROPIC_API_KEY=sk-ant-api03-...   # Depuis console.anthropic.com
WEB_URL=http://localhost:3001
```

> Le serveur refusera de démarrer si `ANTHROPIC_API_KEY` est manquant ou invalide.

> `DATABASE_URL` utilise le pooler Supabase (port 6543).
> `DIRECT_URL` est la connexion directe (port 5432), nécessaire pour `prisma migrate`.

### Web (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 3. Migration Prisma

```bash
cd apps/api
npm run db:generate    # Génère le client Prisma
npm run db:migrate     # Crée les tables (nomme la migration "init")
```

---

## 4. Seed de la base de données

```bash
cd apps/api
npm run db:seed
```

Crée l'utilisateur de test :
- Email : `test@immosafe.fr`
- Mot de passe : `Test1234!`

---

## 5. Lancer le projet en développement

**Depuis la racine du monorepo :**

```bash
npm run dev
```

Turbo lance en parallèle :
- API → http://localhost:3000
- Web → http://localhost:3001

Vérifier que l'API répond : `curl http://localhost:3000/health`

---

## 6. Build de production

```bash
npm run build
```

Build dans l'ordre :
1. `packages/shared-types` → `dist/`
2. `apps/api` → `dist/`
3. `apps/web` → `.next/`

---

## 7. Test de l'authentification (curl)

```bash
# Register
curl -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"nouveau@test.fr","password":"Test1234!"}'

# Login
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@immosafe.fr","password":"Test1234!"}'

# Refresh (utilise le cookie refreshToken)
curl -b cookies.txt -X POST http://localhost:3000/api/auth/refresh

# Logout
curl -b cookies.txt -X POST http://localhost:3000/api/auth/logout
```

---

## 8. Structure des ports

| Service | Port | URL               |
|---------|------|-------------------|
| API     | 3000 | http://localhost:3000 |
| Web     | 3001 | http://localhost:3001 |

---

## Notes importantes

- Le cookie `refreshToken` a le path `/api/auth` — il n'est envoyé qu'aux endpoints d'auth.
- En développement, `secure: false` sur le cookie (pas de HTTPS requis).
- Le token d'accès expire en 15 minutes ; le refresh token en 30 jours avec rotation à chaque usage.
