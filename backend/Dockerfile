# syntax=docker/dockerfile:1.6
# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json tsconfig.build.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev

# --- Runtime stage ---
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
