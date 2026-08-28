FROM node:22-alpine AS frontend
WORKDIR /app
ARG BUILD_SHA
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend ./frontend
# A release must identify itself. The deployment work order supplies this
# immutable Git SHA to both the TV shell and the backend.
RUN test -n "$BUILD_SHA" && VITE_BUILD_ID="$BUILD_SHA" npm run build

FROM rust:1.90-bookworm AS backend
WORKDIR /app
ARG BUILD_SHA
COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src
# Compile the immutable deployment identity into /health. Refuse a build
# without it rather than silently publishing a stale predecessor identity.
RUN test -n "$BUILD_SHA" && BUILD_SHA="$BUILD_SHA" cargo build --release --locked

FROM debian:bookworm-slim AS runtime
RUN groupadd --system lobby && useradd --system --gid lobby --home-dir /app lobby \
    && mkdir -p /app/data && chown -R lobby:lobby /app
WORKDIR /app
COPY --from=backend /app/target/release/living-room-lobby /usr/local/bin/living-room-lobby
COPY --from=frontend /app/dist ./dist
ENV PORT=8080 DATABASE_URL=sqlite://data/lobby.db?mode=rwc RUST_LOG=info
USER lobby
EXPOSE 8080
CMD ["living-room-lobby"]
