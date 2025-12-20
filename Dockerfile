# Multi-stage build for Next.js (App Router) + Prisma

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js + Prisma may evaluate server code during `next build`. Provide placeholders so
# build-time evaluation doesn't fail. (These do NOT get used at runtime in ECS.)
ENV DATABASE_URL="mysql://build:build@localhost:3306/build"
ENV AUTH_JWT_SECRET="build_only_dummy_secret_build_only_dummy"

# Some repos don't have a `public/` directory; ensure it exists for the runner stage.
RUN mkdir -p public

# Prisma client generation is required for runtime
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Minimal runtime files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# Prisma schema is useful for tooling, and Prisma client uses generated artifacts already in node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Bind to 0.0.0.0 for ECS/ALB
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
