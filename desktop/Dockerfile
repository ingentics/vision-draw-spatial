# Image d'empaquetage de l'appli native (SPEC §16) : Node (figé comme l'appli), zip, et rcodesign
# pour signer l'application macOS depuis Linux (signature ad hoc, ou Developer ID plus tard).
FROM node:24.21.0-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl zip \
  && rm -rf /var/lib/apt/lists/*

ARG RCODESIGN_VERSION=0.29.0
RUN arch="$(uname -m)" \
  && curl -fsSL "https://github.com/indygreg/apple-platform-rs/releases/download/apple-codesign%2F${RCODESIGN_VERSION}/apple-codesign-${RCODESIGN_VERSION}-${arch}-unknown-linux-musl.tar.gz" \
    | tar -xz -C /tmp \
  && mv /tmp/apple-codesign-*/rcodesign /usr/local/bin/rcodesign \
  && rm -rf /tmp/apple-codesign-* \
  && rcodesign --version

WORKDIR /app/desktop
