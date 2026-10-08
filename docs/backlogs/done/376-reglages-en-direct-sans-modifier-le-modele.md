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
- Fait :
  - `setSpatial` (`domains/edit/commands/properties.ts`) et `setElementsStyle` (`domains/edit/commands/styles.ts`)
    écrivent le réglage en direct dans la copie de travail (`file.livePage(pageId, this)`), redessinent la forme ou la
    flèche d'après elle, puis la rendent **aussitôt** (`settleLivePage(this)`) : chaque frappe crée et rend sa copie,
    plus simple que d'attendre la fin du `merge` (que le moteur ne connaît pas : le champ ne signale pas sa sortie).
    Le modèle du document n'est plus jamais modifié.
  - Suite « modification en direct écrite » réunie dans `LiveEdit.afterLiveWrite(pageId)`
    (`domains/edit/drag/liveEdit.ts`) : scènes de la page aux autres niveaux et vue graphe à refaire,
    `afterLiveEdit`, `syncModified`, `documentChange`. Appelée par les deux réglages et par la fin d'un déplacement /
    redimensionnement (`domains/edit/drag/gesture.ts`, `afterGeometryEdit`).
  - Écarts de comportement, dus à la suite commune :
    - décalage du texte d'une flèche : les scènes de la page aux autres niveaux et la vue graphe sont désormais
      invalidées (elles gardaient l'ancien décalage jusqu'à leur prochaine reconstruction) ;
    - fin d'un déplacement / redimensionnement : `documentChange` est émis (l'appli reçoit la page modifiée, elle
      gardait l'ancien document), le voile et le contour de sélection sont recalculés et un rendu demandé ;
    - `graph.invalidateWithScenes()` sans `includeCurrent` pour l'étiquette : identique, la page courante n'étant
      jamais la vue graphe quand on édite.
    - En dev, l'exception `TypeError` disparaît ; en production, rien d'autre ne change.
  - Tests : `tests/engine/core/domains/edit/commands/properties.test.ts` et `styles.test.ts` (cœur réduit commun
    `liveCore.ts` : `DocumentFile`, `EditHistory` et `LiveEdit` réels, modèle gelé) : trois frappes fusionnées, le
    fichier et le modèle suivent, la page reste gelée, `documentChange` porte la page à jour, une seule étape
    d'annulation qui ramène l'état d'avant la saisie. Les deux tests levaient `TypeError` avant la correction.
  - Doc : `docs/SUMMARY.md` (modèle jamais modifié en place).
  - Validation : `make check` vert. **Vérifié par les tests seulement** (pas à l'œil dans l'appli) : régler
    l'« Étiquette » d'un process étiqueté (ex. « Tâche de fond » de la palette Architecture) et le « Décalage le long
    du trait » d'une flèche avec texte, puis annuler.
