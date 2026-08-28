# This is deliberately a build argument rather than a git lookup: ACR receives
# source tarballs without .git.  The default also makes a plain local build a
# useful development image.
ARG BUILD_SHA=dev

FROM node:22-alpine AS frontend
WORKDIR /app
ARG BUILD_SHA
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend ./frontend
# The deployment supplies its immutable SHA; the default above becomes the
# local-development release identity when no argument is passed.
RUN VITE_BUILD_ID="$BUILD_SHA" npm run build

FROM rust:1.90-bookworm AS backend
WORKDIR /app
ARG BUILD_SHA
COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src
# Compile the immutable deployment identity into /health.
RUN BUILD_SHA="$BUILD_SHA" cargo build --release --locked

FROM debian:bookworm-slim AS runtime
ARG BUILD_SHA
RUN groupadd --system lobby && useradd --system --gid lobby --home-dir /app lobby \
    && mkdir -p /app/data && chown -R lobby:lobby /app
WORKDIR /app
COPY --from=backend /app/target/release/living-room-lobby /usr/local/bin/living-room-lobby
COPY --from=frontend /app/dist ./dist
# Keep the supplied identity in the final image too. The binary is compiled
# with the same value, so /health works with only PORT configured at runtime.
ENV BUILD_SHA=${BUILD_SHA} PORT=8080 DATABASE_URL=sqlite://data/lobby.db?mode=rwc RUST_LOG=info
USER lobby
EXPOSE 8080
CMD ["living-room-lobby"]
