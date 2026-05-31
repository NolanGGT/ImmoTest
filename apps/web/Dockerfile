FROM node:20-alpine AS base
WORKDIR /app

# ── 1. Install dependencies ────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared-types/package*.json ./packages/shared-types/
RUN npm ci --workspace=apps/web --workspace=packages/shared-types

# ── 2. Build shared-types ──────────────────────────────────────────────────────
FROM deps AS builder-types
COPY packages/shared-types/ ./packages/shared-types/
RUN npm run build --workspace=packages/shared-types

# ── 3. Build Next.js app ───────────────────────────────────────────────────────
FROM builder-types AS builder-web
COPY apps/web/ ./apps/web/

# Build-time public env vars must be baked in at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

RUN npm run build --workspace=apps/web

# ── 4. Lean production image ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone output bundles its own node_modules — copy only what's needed
COPY --from=builder-web /app/apps/web/.next/standalone ./
COPY --from=builder-web /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder-web /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
