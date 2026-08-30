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

FROM rust:1-slim AS backend
WORKDIR /app
ARG BUILD_SHA
COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src
# The 404 document is compiled into the server so an unknown URL keeps the
# product's navigation and accessible recovery action instead of returning a
# bare server error.  It must be present in this independent Rust build stage.
COPY frontend/public/404.html ./frontend/public/404.html
# Compile the immutable deployment identity into /health.
RUN BUILD_SHA="$BUILD_SHA" cargo build --release --locked

FROM debian:bookworm-slim AS runtime
ARG BUILD_SHA
RUN groupadd --system lobby && useradd --system --gid lobby --home-dir /app lobby \
    && mkdir -p /app/data /data && chown -R lobby:lobby /app /data
WORKDIR /app
COPY --from=backend /app/target/release/living-room-lobby /usr/local/bin/living-room-lobby
COPY --from=frontend /app/dist ./dist
# The binary already compiles this identity into /health. Keep it as image
# metadata while leaving PORT as the only runtime configuration the container
# needs from the factory.
LABEL org.opencontainers.image.revision=${BUILD_SHA}
ENV PORT=8080
USER lobby
EXPOSE 8080
CMD ["living-room-lobby"]
