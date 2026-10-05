# Tout passe par Docker : la version de Node et des dépendances est celle de l'image.
PORT ?= 5173
URL  := http://localhost:$(PORT)/

COMPOSE := PORT=$(PORT) COMPOSE_BAKE=false docker compose
RUN     := $(COMPOSE) run --rm --no-deps app

.DEFAULT_GOAL := help
.PHONY: help image .image dev plantuml plantuml-down test lint check drawio-check build lib desktop desktop-dev desktop-package desktop-install desktop-web desktop-lock preview shell lock down clean

help: ## Affiche les commandes disponibles
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  \033[36mmake %-16s\033[0m %s\n", $$1, $$2}'

image: ## Construit l'image (Node + dépendances)
	$(COMPOSE) build

# Build silencieux (rapide si rien n'a changé), prérequis des autres cibles.
.image:
	@$(COMPOSE) build -q

dev: .image ## Lance l'appli en dev (PORT=5173 par défaut)
	@printf '\n  Drawio Spatial → \033]8;;$(URL)\033\\\033[1;36m$(URL)\033[0m\033]8;;\033\\\n\n'
	@$(COMPOSE) up --renew-anon-volumes --remove-orphans

PLANTUML_PORT ?= 8080
plantuml: ## Lance en arrière-plan un serveur PlantUML local (PLANTUML_PORT=8080 par défaut)
	@PLANTUML_PORT=$(PLANTUML_PORT) $(COMPOSE) --profile plantuml up -d plantuml
	@printf '\n  Serveur PlantUML → http://localhost:$(PLANTUML_PORT)/\n\n'

plantuml-down: ## Arrête le serveur PlantUML local
	@$(COMPOSE) --profile plantuml stop plantuml

test: .image ## Lance les tests
	$(RUN) npm test

lint: .image ## Lint + typecheck + format
	$(RUN) sh -c 'npx eslint . --ext .ts,.tsx && npx tsc -b && npx prettier --check .'

check: lint test ## Tout vérifier

# draw.io installé sur la machine (pas dans Docker) : réenregistre les fixtures (SPEC §15).
DRAWIO ?= /Applications/draw.io.app/Contents/MacOS/draw.io
# Fixtures volontairement invalides pour draw.io (robustesse du parseur) : non réenregistrées.
DRAWIO_SKIP := broken.drawio groups.drawio roundtrip.drawio
# Fixtures dont on compare aussi le rendu de draw.io (export SVG) avec le nôtre.
DRAWIO_SVG := anchor-auto-routing.drawio anchor-routing.drawio edge-ends.drawio edge-routing.drawio edge-points.drawio shapes.drawio labels.drawio line-jumps.drawio

drawio-check: .image ## Réenregistre les fixtures avec draw.io, vérifie la conservation (spatial.*, bouts des flèches) et le tracé (SVG)
	@test -x "$(DRAWIO)" || { echo "draw.io introuvable : make drawio-check DRAWIO=/chemin/vers/draw.io"; exit 1; }
	@mkdir -p tests/fixtures/drawio-saved
	@for f in tests/fixtures/*.drawio; do \
	  n=$$(basename $$f); \
	  case " $(DRAWIO_SKIP) " in *" $$n "*) continue;; esac; \
	  "$(DRAWIO)" -x -f xml --uncompressed -o tests/fixtures/drawio-saved/$$n $$f > /dev/null || exit 1; \
	done
	@for n in $(DRAWIO_SVG); do \
	  "$(DRAWIO)" -x -f svg -o tests/fixtures/drawio-saved/$${n%.drawio}.svg tests/fixtures/$$n > /dev/null || exit 1; \
	done
	$(RUN) npx vitest run tests/engine/spatial tests/engine/edit/edgeEndsFixture.test.ts tests/engine/render/edges/routingFixture.test.ts tests/engine/edit/edgePointsFixture.test.ts tests/engine/shapes/shapesFixture.test.ts tests/engine/render/labelsFixture.test.ts

build: .image ## Build de production dans dist/
	$(RUN) npm run build

lib: .image ## Build de la bibliothèque (composant React + moteur) dans dist-lib/
	$(RUN) npm run build:lib

# Appli native (SPEC §16, Electron) : tout se construit dans Docker (runtime Electron de la machine
# hôte, appli web, empaquetage, signature ad hoc) ; seule l'ouverture de l'appli se fait sur la machine.
DESKTOP_OS   ?= $(shell uname -s | tr '[:upper:]' '[:lower:]')
DESKTOP_ARCH ?= $(shell uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')
DESKTOP_RUN  := $(COMPOSE) --profile desktop run --rm --no-deps desktop
ELECTRON_DIST := desktop/node_modules/electron/dist
ifeq ($(DESKTOP_OS),darwin)
  ELECTRON_BIN := $(ELECTRON_DIST)/Electron.app/Contents/MacOS/Electron
  DESKTOP_OPEN := open "dist-desktop/Drawio Spatial.app"
else
  ELECTRON_BIN := $(ELECTRON_DIST)/electron
  DESKTOP_OPEN := "dist-desktop/drawio-spatial-linux-$(DESKTOP_ARCH)/electron" &
endif

desktop-install: ## Installe le runtime Electron de cette machine (téléchargé dans Docker)
	@$(COMPOSE) --profile desktop build -q desktop
	$(DESKTOP_RUN) sh -c 'npm ci --no-audit --no-fund && ELECTRON_INSTALL_PLATFORM=$(DESKTOP_OS) ELECTRON_INSTALL_ARCH=$(DESKTOP_ARCH) node node_modules/electron/install.js'

desktop-lock: ## Met à jour desktop/package-lock.json (après modif de desktop/package.json)
	@$(COMPOSE) --profile desktop build -q desktop
	$(DESKTOP_RUN) npm install --no-audit --no-fund --ignore-scripts

# Appli web en chemins relatifs (chargée depuis le disque par Electron).
desktop-web: .image
	$(RUN) node_modules/.bin/vite build --base ./ --outDir desktop/web --emptyOutDir

desktop-package: desktop-web ## Construit et signe l'appli native dans dist-desktop/ (.app + .zip)
	@test -x "$(ELECTRON_BIN)" || $(MAKE) desktop-install
	@$(COMPOSE) --profile desktop build -q desktop
	$(DESKTOP_RUN) node package.mjs $(DESKTOP_OS) $(DESKTOP_ARCH)

desktop: desktop-package ## Construit puis ouvre l'appli native
	$(DESKTOP_OPEN)

desktop-dev: ## Ouvre l'appli native sur le serveur de dev (make dev doit tourner : rechargement à chaud)
	@test -x "$(ELECTRON_BIN)" || $(MAKE) desktop-install
	DRAWIO_SPATIAL_DEV_URL=$(URL) "$(ELECTRON_BIN)" desktop

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
	rm -rf dist dist-lib dist-desktop desktop/web node_modules/.tmp node_modules/.vite
	-docker image rm drawio-spatial-dev drawio-spatial-desktop
