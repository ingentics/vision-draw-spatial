# Icône Séquences : flèches plus fines

> Itération — modes de page (onglets) ; reprise de 198

- Les flèches de l'icône (accent) passent à un trait de 1 (au lieu de 1,2) et s'arrêtent avant les lignes de vie, sans
  les chevaucher.
- **Fini quand :** sur `fixtures/flows.drawio`, les flèches de l'icône sont fines et un jour les sépare des lignes de
  vie ; `make check` vert.
- Fait : `.mode-icon-accent` à 1 de trait (`src/app/main.css`) ; flèches de l'icône raccourcies de x 4,7 à 11,3, à
  1,2 des lignes de vie (`src/engine/modes/sequences/index.ts`). Vérifié dans l'appli sur `fixtures/flows.drawio`.
