# --- Base Image ---
FROM node:20-alpine AS base
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3000

CMD ["sh", "-c", "sleep 10 && npx prisma migrate deploy && npm run start"]
