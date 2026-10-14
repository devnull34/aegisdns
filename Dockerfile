# Multi-stage Dockerfile for AegisDNS (Rust + WebUI)
# Stage 1: Build the React/Vite Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# Stage 2: Build the high-performance Rust Engine
FROM rust:1.85-alpine AS rust-builder
RUN apk add --no-cache musl-dev pkgconfig openssl-dev openssl-libs-static
WORKDIR /usr/src/aegisdns
COPY rust_engine/Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src
COPY rust_engine/src ./src
RUN cargo build --release

# Stage 3: Minimal hardened Alpine runner container
FROM alpine:3.21 AS runner
RUN apk add --no-cache ca-certificates tzdata wget
WORKDIR /app

# Copy compiled Rust binary
COPY --from=rust-builder /usr/src/aegisdns/target/release/aegisdns /app/aegisdns

# Copy built frontend assets to be served statically by the Axum server
COPY --from=frontend-builder /app/dist /app/static

ENV RUST_LOG=info
ENV PORT=3000
ENV HOST=0.0.0.0
ENV STATIC_DIR=/app/static
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/aegisdns"]
