# Icône du mode au thème de l'appli

> Itération — modes de page (onglets) ; reprise de 197

- L'icône d'un mode prend le style des icônes d'arrangement : formes pleines grises (`--muted`), repères fins gris en
  pointillé, trait d'accent (`--accent`) pour l'essentiel. Un mode la déclare en trois tracés : `fill`, `line`,
  `accent`.
- Séquences : un acteur et un participant pleins, leurs lignes de vie en pointillé, le message (flèche pleine) et sa
  réponse (flèche pointillée) en accent.
- **Fini quand :** sur `fixtures/flows.drawio`, l'icône de l'onglet Séquences suit ce style, lisible en taille réelle ;
  `make check` vert.
- Fait : `icon` devient un `ModeIcon` (`fill`, `line`, `accent`) dans `src/engine/modes/types.ts` (et
  `docs/AJOUTER_UN_MODE.md`) ; Séquences : acteur (tête et buste) et participant (cadre arrondi) pleins, lignes de vie
  en pointillé, message et réponse en accent (`src/engine/modes/sequences/index.ts`). `PageTabs` dessine un tracé par
  partie, classes `.mode-icon-fill / -line / -accent` calquées sur `.arrange-bar / -ref / -mark` (`main.css`), icône à
  16 px. Vérifié dans l'appli sur `fixtures/flows.drawio`, en taille réelle et agrandie.
