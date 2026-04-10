FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Tokens passed at runtime — never bake secrets into the image
ENV CODA_API_TOKEN=""
ENV MCP_ACCESS_TOKEN=""
ENV MODE="http"
ENV PORT="3000"
ENV HOST="0.0.0.0"

EXPOSE 3000

ENTRYPOINT ["node", "dist/index.js"]
