# Tout passe par Docker : la version de Node et des dépendances est celle de l'image.
PORT ?= 5173
URL  := http://localhost:$(PORT)/

COMPOSE := PORT=$(PORT) COMPOSE_BAKE=false docker compose
RUN     := $(COMPOSE) run --rm --no-deps app

.DEFAULT_GOAL := help
.PHONY: help image .image dev test lint check build preview shell lock down clean

help: ## Affiche les commandes disponibles
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  \033[36mmake %-8s\033[0m %s\n", $$1, $$2}'

image: ## Construit l'image (Node + dépendances)
	$(COMPOSE) build

# Build silencieux (rapide si rien n'a changé), prérequis des autres cibles.
.image:
	@$(COMPOSE) build -q

dev: .image ## Lance l'appli en dev (PORT=5173 par défaut)
	@printf '\n  Drawio Spatial → \033]8;;$(URL)\033\\\033[1;36m$(URL)\033[0m\033]8;;\033\\\n\n'
	@$(COMPOSE) up --renew-anon-volumes --remove-orphans

test: .image ## Lance les tests
	$(RUN) npm test

lint: .image ## Lint + typecheck + format
	$(RUN) sh -c 'npx eslint . --ext .ts,.tsx && npx tsc -b && npx prettier --check .'

check: lint test ## Tout vérifier

build: .image ## Build de production dans dist/
	$(RUN) npm run build

preview: build ## Sert le build de production
	@printf '\n  Drawio Spatial (build) → \033]8;;$(URL)\033\\\033[1;36m$(URL)\033[0m\033]8;;\033\\\n\n'
	@$(COMPOSE) run --rm --no-deps --service-ports app node_modules/.bin/vite preview --host 0.0.0.0 --port 5173 --strictPort

shell: .image ## Ouvre un shell dans le conteneur
	$(RUN) bash

lock: ## Met à jour package-lock.json depuis le conteneur (après modif de package.json)
	$(COMPOSE) run --rm --no-deps app npm install --no-audit --no-fund
	$(COMPOSE) build

down: ## Arrête les conteneurs
	$(COMPOSE) down --remove-orphans

clean: down ## Supprime dist/, les caches et l'image
	rm -rf dist node_modules/.tmp node_modules/.vite
	-docker image rm drawio-spatial-dev
