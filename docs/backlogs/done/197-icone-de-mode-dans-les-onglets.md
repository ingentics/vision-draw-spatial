# Icône du mode dans l'onglet de page

> Itération — modes de page (onglets) ; reprise de 70 et 69

- Un mode peut déclarer une petite icône (`icon` : tracé SVG 16 × 16, dessiné au trait). Séquences : un acteur et un
  participant, leurs lignes de vie, un message (flèche pleine) et sa réponse (flèche pointillée).
- L'onglet d'une page en mode affiche l'icône du mode à gauche de son nom (survol : nom du mode) ; une page normale ou
  d'un mode sans icône ne change pas.
- **Fini quand :** sur `fixtures/flows.drawio`, l'onglet de la page Séquences montre l'icône, les autres non ;
  `make check` vert.
- Fait : `icon` dans `PageModeDefinition` (`src/engine/modes/types.ts`, documenté dans `docs/AJOUTER_UN_MODE.md`),
  tracé de Séquences d'après le modèle fourni (`src/engine/modes/sequences/index.ts`). `PageTabs` reçoit `modeOf`
  (registre des modes du moteur, depuis `Viewer`) et dessine l'icône devant le nom (`.tab-mode-icon` dans
  `main.css`, survol « Mode Séquences »). Vérifié dans l'appli sur `fixtures/flows.drawio`.
