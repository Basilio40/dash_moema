# Multi-stage build for Railway.
# Uses Node.js 22 LTS (required by Vite 8: needs Node >= 20.19 or >= 22.12)
# and Bun only for fast dependency installation (the project ships a bun.lock).

# ---- Build stage -------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install Bun for dependency installation (matches bun.lock).
RUN npm install -g bun

# Copy dependency manifests first to leverage Docker layer caching.
COPY package.json bun.lock bunfig.toml ./

# Install exact versions from the lockfile.
RUN bun install --frozen-lockfile

# Copy the rest of the source and build the production server (Nitro node-server).
COPY . .
RUN bun run build

# ---- Production stage --------------------------------------------------------
FROM node:22-bookworm-slim AS production
WORKDIR /app

ENV NODE_ENV=production
# Nitro's node-server preset binds to 0.0.0.0 and reads PORT automatically;
# these are set explicitly for clarity and as a fallback.
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy the built server output (includes server + public assets).
COPY --from=build /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]