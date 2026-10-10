# Post-it verrouillé : réglage « Labels » jamais recopié

> Dette vue à l'audit 500 (reprise de 475) — mode Event storming

- `syncLabels` (`labels/pageLabels.ts:18`) recopie `spatial.es.labels` par `setElementAttribute`, que
  `modeEditWriter.ts:117` ignore sur un élément verrouillé : un post-it verrouillé garde son label quand la page les
  masque, et l'export (`showsLabel`) suit cette copie fausse. Choix à faire : écriture d'une clé du mode permise sur
  un élément verrouillé, ou dessin qui lit le réglage de la page.
- Ce qu'on veut (repris le 2026-10-10, choix de l'utilisateur : clé du mode permise) :
  - `ModeEdit.setElementAttribute` prend une option `{ derived: true }` : valeur recopiée d'un réglage (ex. réglage
    de la page recopié sur chaque forme), écrite même sur un élément verrouillé. Sans l'option, rien ne change (sujet
    324 : le panneau ne modifie toujours pas un élément verrouillé).
  - `syncLabels` passe l'option ; texte, géométrie, style et ordre d'un post-it verrouillé restent protégés.
- **Fini quand :** sur `eventstorming-commande.drawio`, un post-it verrouillé perd son label quand on décoche
  « Labels » et le retrouve quand on le recoche, ⌘Z compris ; `make check` vert.
- Fait : option `{ derived: true }` de `ModeEdit.setElementAttribute` (`core/modes/modeEdit.ts`,
  `modeEditWriter.ts`) : la copie d'un réglage est écrite même sur un élément verrouillé ; sans l'option, rien ne
  change (sujet 324). `syncLabels` (`labels/pageLabels.ts`) la passe. Écart : un post-it verrouillé suit maintenant
  « Labels » (dessin et en-tête exporté). Tests `modeEditWriter.test.ts` (option sur l'élément verrouillé),
  `pageLabels.test.ts` (post-it verrouillé : label suivi, verrou intact) ; doc `AJOUTER_UN_MODE.md` (exception au
  verrou). Vérifié dans l'appli sur `eventstorming-commande.drawio` : « Payer » verrouillé, « Labels » décoché, son
  label disparaît comme les autres ; recoché, il revient ; ⌘Z rétablit chaque étape, verrou compris.
