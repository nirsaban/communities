# syntax=docker/dockerfile:1.6
# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Install deps. We intentionally skip package-lock.json because the local copy
# pins resolved URLs at a private artifactory the build container can't reach.
# Fresh resolution from package.json against the public registry is fine — Vite
# pins majors and React+TS are stable.
COPY package.json ./
RUN npm config set registry https://registry.npmjs.org/ \
  && npm install --no-audit --no-fund --no-package-lock

# Copy sources and build.
COPY tsconfig.json tsconfig.tsbuildinfo* postcss.config.js tailwind.config.js vite.config.ts index.html ./
COPY public ./public
COPY src ./src

# Vite reads VITE_API_BASE_URL at build time. Defaults to `/api/v1` which
# pairs with nginx proxying the api on the same origin.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# --- Runtime stage: nginx serving static + proxying /api → api container ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# Healthcheck via the SPA index — if nginx is up, this is 200.
HEALTHCHECK --interval=20s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1
