# Drawio Spatial

@docs/ROADMAP.md

Référence fonctionnelle et technique : `docs/SPEC.md` (à lire au besoin, pas chargée d'office : 80 Ko).

## Règles de travail

- **Serveur partagé.** Pendant le dev, un seul serveur en hot reload : le `make dev` de l'utilisateur (port 5173),
  qu'il suit dans son navigateur. On vérifie à l'œil dessus (`curl localhost:5173` pour savoir s'il tourne) ; on n'en
  lance pas un autre. S'il est arrêté, on lance `make dev` (projet compose par défaut, port 5173) en arrière-plan pour
  que ce soit lui le serveur partagé. Une modification du moteur recharge la page en restaurant fichier, page et
  caméra (plugin dans `vite.config.ts`, `src/app/devSession.ts`) : garder cette restauration fonctionnelle.
- **`make check` avant tout commit.** On ne commite que si `make check` sort à 0 : lancer le check
  (avec `COMPOSE_PROJECT_NAME=drawio-claude` pour ne pas toucher au conteneur de l'utilisateur), récupérer son code
  de retour et ne lancer `git commit` que s'il vaut 0 — jamais `make check ; git commit`. Les fichiers modifiés par
  l'utilisateur lui-même restent hors du commit.
