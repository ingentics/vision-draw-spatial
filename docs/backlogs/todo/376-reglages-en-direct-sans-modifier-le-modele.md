# Réglages en direct : écrire dans la copie de travail, pas dans le modèle gelé

> Architecture du moteur — modèle jamais modifié en place (suite de 312). Audit du 2026-10-08 (`AUDIT.md`).

- Constat : deux réglages « en direct » (`merge` posé, frappe au clavier) écrivent dans la page **du document**, que
  `targets.editablePage()` rend telle quelle (`pages.pageById`, `domains/document/pages.ts:177-180`) :
  - `setSpatial` (`domains/edit/commands/properties.ts:84-89`) : `values[key] = text` sur `shape.style` ou
    `shape.attributes`, pour un champ `text` déclaré `live` par une forme (« Étiquette » du process étiqueté,
    `plugins/shapes/generic/tagged-process/index.ts:139`) ;
  - `setElementsStyle` (`domains/edit/commands/styles.ts:62-66`) : `style[key] = value` pour les clés
    `LIVE_EDGE_TEXT_KEYS` (« Décalage le long du trait », `src/app/ContextPanel.tsx:701`).
  En dev et en test ces pages sont gelées (`freezeModel`, `domains/document/file.ts:130`) : l'écriture lève une
  `TypeError` ; en production le modèle est modifié en place, contre la règle du sujet 312. Aucun test n'appelle ces
  deux chemins.
- Ce qu'on veut :
  - reproduire d'abord dans l'appli (serveur 5173 : régler l'étiquette d'un process étiqueté, puis le décalage du
    texte d'une flèche) et noter ce qu'on voit ;
  - les deux chemins écrivent dans la copie de travail (`core.file.livePage(pageId, owner)`), rendue page du document
    par `settleLivePage(owner)` à la fin de la saisie (fin du `merge`) ou tout de suite si c'est plus simple ;
  - la suite « modification en direct écrite » (redessin ciblé, `live.afterLiveEdit`, `edits.syncModified`,
    `documentChange`), recopiée dans `properties.ts:90-98`, `styles.ts:68-71` et `domains/edit/drag/gesture.ts:356-361`,
    devient une méthode unique (de `LiveEdit` ou `DocumentFile`).
- Écart de comportement : en dev, l'exception disparaît ; en production, aucun.
- Tests : un test par chemin (`tests/engine/core/domains/edit/commands/…`) : saisie en direct sur un modèle gelé, le
  fichier et le modèle suivent, aucune exception, une seule étape d'annulation pour la saisie.
- **Fini quand :** les deux réglages se tapent dans l'appli sans erreur en console, le rendu suit à chaque frappe, une
  annulation défait toute la saisie ; tests verts ; `make check` vert.
