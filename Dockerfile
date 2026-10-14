# syntax=docker/dockerfile:1
# ==============================================================================
# AegisDNS — Production Multi-Stage Dockerfile
# Optimized for Private GitHub Repositories, GHCR, and Local Docker Compose
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Frontend & Server Builder
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

# Install git and ca-certificates for private git dependencies/submodules if needed
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Build arguments for authenticating with private GitHub repos if using private git dependencies
# Pass via: docker build --build-arg GITHUB_TOKEN=${GITHUB_TOKEN} .
ARG GITHUB_TOKEN=""

# Cache npm layers
COPY package*.json ./

# Install dependencies (All packages are standard public npm packages; no NPM tokens required)
RUN --mount=type=cache,target=/root/.npm \
    if [ -n "$GITHUB_TOKEN" ]; then \
      git config --global url."https://${GITHUB_TOKEN}:x-oauth-basic@github.com/".insteadOf "https://github.com/"; \
    fi; \
    npm ci || npm install; \
    rm -f ~/.gitconfig

# Copy full application source code (filtered via .dockerignore)
COPY . .

# Build Vite frontend bundle and compile server.ts via esbuild into dist/
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Node Runner (Default Target)
# Serves the full AegisDNS API, Precache Engine, Recommendation Engine, and UI
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

# Install wget for healthcheck and ca-certificates for upstream HTTPS/DoH queries
RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install only production dependencies (public npm packages only)
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts || npm install --omit=dev; \
    npm cache clean --force

# Copy compiled frontend and bundled server from builder stage
COPY --from=builder /app/dist ./dist

# Copy bundled software data cache (Majestic Million top domains seed and offline datasets)
COPY --from=builder /app/data ./data
COPY --from=builder /app/src/server/data ./src/server/data

# Ensure data directories exist and set ownership to non-root node user
RUN mkdir -p /app/data /app/src/server/data && chown -R node:node /app

# Switch to non-root user for security compliance in private organizations
USER node

# Healthcheck monitoring the AegisDNS health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "dist/server.js"]

# ------------------------------------------------------------------------------
# Stage 3: Optional Standalone Rust Micro-Engine
# Can be targeted via: docker build --target rust-runner -t aegisdns:rust .
# ------------------------------------------------------------------------------
FROM rust:1.85-alpine AS rust-builder
RUN apk add --no-cache musl-dev pkgconfig openssl-dev openssl-libs-static
WORKDIR /usr/src/aegisdns
COPY rust_engine/Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src
COPY rust_engine/src ./src
RUN cargo build --release

FROM alpine:3.21 AS rust-runner
RUN apk add --no-cache ca-certificates tzdata wget
WORKDIR /app
COPY --from=rust-builder /usr/src/aegisdns/target/release/aegisdns /app/aegisdns
COPY --from=builder /app/dist /app/static

ENV RUST_LOG=info
ENV PORT=3000
ENV HOST=0.0.0.0
ENV STATIC_DIR=/app/static
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/aegisdns"]
