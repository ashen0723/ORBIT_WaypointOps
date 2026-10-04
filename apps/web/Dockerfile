# Build context: repository root (npm workspaces need the root lockfile).
#   docker build -f apps/web/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --workspace @waypoint/web --workspace @waypoint/contracts --include-workspace-root

COPY packages/contracts packages/contracts
COPY apps/web apps/web

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ARG VITE_AUTH_SOURCE=mock
ENV VITE_AUTH_SOURCE=${VITE_AUTH_SOURCE}
ARG VITE_STORE_DATA_SOURCE=mock
ENV VITE_STORE_DATA_SOURCE=${VITE_STORE_DATA_SOURCE}
RUN npm run build --workspace @waypoint/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
