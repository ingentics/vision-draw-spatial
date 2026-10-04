# Bordure de la pastille de flux à 1 px

> Itération — mode Séquences (habillage) ; reprise de 72

- Bordure noire de la pastille à 1 px aussi sur la pastille d'une flèche avec texte (au lieu de 1,5 px).
- **Fini quand :** sur `sequences.drawio`, toutes les pastilles ont une bordure de 1 px ; `make check` vert.
- Fait : `render/decorations.ts` — épaisseur de bordure commune `EDGE_BADGE_BORDER_WIDTH = 1` (plus de valeur par
  taille de pastille). Vérifié dans l'appli sur `sequences.drawio`.
