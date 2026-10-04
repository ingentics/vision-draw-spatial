# Étape 5 — Pages / onglets

> Milestone 1 — Viewer

- Sélecteur de pages dans l'UI.
- Tout le document en mémoire ; scènes Three.js construites à la demande et mises en cache (`SceneManager`, plafond `maxCachedPages`, libération de la moins récemment affichée).
- Chaque page garde sa caméra ; mémorisée aussi pour le rechargement en dev (base du `cameraByPage` de l'étape 6).
- **Fini quand :** on bascule entre les pages d'un fichier multi-pages sans rechargement.
