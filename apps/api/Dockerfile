FROM node:20-alpine AS base
WORKDIR /app

# ── 1. Install dependencies ────────────────────────────────────────────────────
FROM base AS deps
# Copy manifests only — docker layer cache busts only when these change
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared-types/package*.json ./packages/shared-types/
RUN npm ci --workspace=apps/api --workspace=packages/shared-types

# ── 2. Build shared-types ──────────────────────────────────────────────────────
FROM deps AS builder-types
COPY packages/shared-types/ ./packages/shared-types/
RUN npm run build --workspace=packages/shared-types

# ── 3. Build API ───────────────────────────────────────────────────────────────
FROM builder-types AS builder-api
COPY apps/api/ ./apps/api/
RUN npm run build --workspace=apps/api

# ── 4. Lean production image ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder-api /app/apps/api/dist ./dist
COPY --from=builder-api /app/apps/api/package*.json ./
COPY --from=builder-api /app/apps/api/prisma ./prisma
COPY --from=builder-api /app/node_modules ./node_modules
COPY --from=builder-api /app/apps/api/prompts ./prompts

RUN npx prisma generate

EXPOSE 3000

# migrate deploy is safe for prod (no interactive prompts, no dev migrations)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
