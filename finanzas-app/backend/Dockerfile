FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder --chown=node:node /app/dist ./dist
USER node
EXPOSE 3001
# Railway uses railway.json healthcheckPath; this covers plain `docker run`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3001}/health" >/dev/null || exit 1
# Migrations run as a separate step (railway.json deploy.preDeployCommand):
#   npx typeorm migration:run -d dist/database/data-source.js
CMD ["node", "dist/main"]
