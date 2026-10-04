# Build context: repository root (npm workspaces need the root lockfile).
#   docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim AS base

# Prisma's schema engine (used by `prisma migrate deploy`) needs OpenSSL.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS build

# Install dependencies first for layer caching. Every workspace manifest must be present for `npm ci`
# to validate the lockfile, even though only the api workspace is installed.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --workspace @waypoint/api --include-workspace-root

COPY packages/contracts packages/contracts
COPY apps/api apps/api

WORKDIR /app/apps/api
RUN npm run build

# Keep Prisma/tsx tooling for the Compose db-init one-shot service.
# The long-running API process starts only after that service succeeds.
FROM base AS runtime
COPY --from=build /app /app
WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3000

USER node
CMD ["node", "dist/main.js"]
