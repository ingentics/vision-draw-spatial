# Étape 18 — Composant React

> Milestone 3 — Packaging

- `<DrawioSpatial />` avec props (contenu ou store, settings, callbacks), documentation, exemple d'intégration.
- Fait : props `xml` ou `store` + `fileId` (vue mémorisée dans le store, contenu enregistré à la sauvegarde), `editable` (moteur en visionneuse par défaut), `settings`, `fonts`, `background`, mini-carte contrôlée ou non ; événements `onLoad`, `onPageChange`, `onSelectionChange`, `onCameraChange`, `onModifiedChange`, `onSave`, `onError`, `onEngine` ; `ref` (`save`, `undo`, `redo`, `engine`) ; Ctrl+S / Ctrl+Z traités dans le composant. API publique `src/index.ts`, `make lib` (`dist-lib/` : module ES, `style.css`, types ; React fourni par l'hôte). Documentation `docs/COMPOSANT.md`, exemple `examples/basic/` (http://localhost:5173/examples/basic/).
