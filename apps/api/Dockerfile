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
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=apps/api

# ── 4. Lean production image ───────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder-api /app/apps/api/dist ./dist
COPY --from=builder-api /app/apps/api/package*.json ./
COPY --from=builder-api /app/apps/api/prisma ./prisma
COPY --from=builder-api /app/node_modules ./node_modules
COPY --from=builder-api /app/apps/api/prompts ./prompts

EXPOSE 3011

COPY apps/api/start.sh ./start.sh
RUN chmod +x ./start.sh

CMD ["./start.sh"]
