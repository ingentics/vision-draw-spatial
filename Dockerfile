# Version de Node figée : c'est l'image, et non la machine hôte, qui fait foi.
FROM node:24.21.0-bookworm-slim

WORKDIR /app

# Dépendances installées depuis le lockfile uniquement (reproductible).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 5173
CMD ["node_modules/.bin/vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
