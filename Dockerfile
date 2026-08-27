FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend ./frontend
RUN npm run build

FROM rust:1.90-bookworm AS backend
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src
RUN cargo build --release --locked

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
