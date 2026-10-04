# Pastille de flux plus lisible

> Itération — mode Séquences (habillage) ; reprise de 70

- Pastille d'une flèche avec texte : deux fois plus grosse (rayon 8 → 16, chiffre 10 → 20) ; la petite pastille d'une
  flèche sans texte ne change pas.
- Chiffre de la pastille toujours en blanc (plus de choix noir / blanc selon le contraste).
- **Fini quand :** sur `sequences.drawio`, la pastille de « login » est deux fois plus grosse que celle de la flèche
  sans texte, chiffres blancs sur toutes les pastilles ; `make check` vert.
- Fait : `render/decorations.ts` (`EDGE_BADGE.labelled` : rayon 16, chiffre 20 ; chiffre blanc, `contrastText`
  retiré), commentaire de `EdgeBadge` (`modes/types.ts`), test du rendu (`tests/engine/modes/sequences.test.ts` :
  taille et couleur des chiffres). Vérifié dans l'appli sur `sequences.drawio` : grosses pastilles sur « login » et
  « hors flux », petite sur la flèche sans texte, chiffres blancs.
