# Découpage du moteur en domaines

> Refactorisation — moteur (`src/engine/Engine.ts`, ≈ 5 000 lignes)

- `Engine.ts` reste la façade publique (mêmes méthodes, mêmes types exportés) : il délègue à `src/engine/core/`.
- `src/engine/core/` : `EngineCore` (infrastructure, câblage) et un dossier par domaine fonctionnel, avec
  sous-domaines au besoin : `runtime/` (rendu, viewport, paramètres), `document/` (document, pages, annulation),
  `view/` (caméra, modes de vue, niveaux, scène, graphe, mini-carte), `selection/`, `input/`, `navigation/`
  (liens, retour, transitions), `modes/`, `edit/` (cibles modifiables, poignées, flèches, glisser, textes,
  commandes).
- Chaque domaine porte son état ; aucun changement de comportement.
- Un commit par étape (un ou plusieurs domaines extraits), l'appli restant fonctionnelle à chaque étape.
- **Fini quand :** `Engine.ts` ne contient plus que la façade, chaque domaine est dans `core/` ; navigation,
  sélection, édition (déplacer, redimensionner, connecter, textes, copier / coller, annuler), vues 2D / iso / 3D,
  transitions et graphe fonctionnent comme avant dans l'appli ; `make check` vert.
