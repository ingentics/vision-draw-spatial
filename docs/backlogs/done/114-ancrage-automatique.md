# Ancrage automatique des flèches

> Itération — flèches (points d'ancrage) ; reprise de 108 à 111. Second type d'ancrage, à côté du manuel.

- Réglage d'appli « Ancrage des flèches » : **Manuel** (défaut, points d'ancrage subdivisés, 108) ou
  **Automatique** ; une page peut le surcharger (panneau Page, section Page — ce n'est pas un mode de page) :
  attribut `spatial.anchoring="manual|auto"` de `<diagram>`, absent = réglage de l'appli.
- En automatique, l'utilisateur ne choisit que le **côté** : en tirant une flèche (poignée de connexion ou bout),
  le côté de la forme visée le plus proche du pointeur est surligné ; la poignée de connexion fixe le côté de départ.
- Les flèches d'un côté y sont **réparties** : n flèches à 1/(n+1), 2/(n+1)… (`exitX/exitY`, `entryX/entryY`),
  ordonnées par la position de leur autre bout le long du côté (pas de croisement). Toutes les flèches du côté
  comptent, y compris celles en attache auto (passées en point fixe sur le côté qui fait face à leur autre bout).
- Recalcul à chaque édition (création, rattachement, suppression, déplacement, redimensionnement, collage), dans la
  même étape d'annulation, pour les formes touchées et leurs voisines ; passer une page en automatique la répartit
  entière. Les coudes des boucles suivent.
- **Fini quand :** en automatique, trois flèches tirées vers le haut d'une forme y arrivent à 0,25, 0,5 et 0,75 sans
  se croiser ; en supprimer une répartit les deux autres à 1/3 et 2/3 ; déplacer une cible réordonne ; une page en
  « Manuel » garde le comportement de 108 ; `make check` vert.
- Fait : `src/engine/edit/distribute.ts` (`distributeAnchors`, `affectedShapes` sur une empreinte `pageGeometry`
  prise au dernier état enregistré — le direct d'un glisser modifie le modèle), `src/engine/Engine.ts`
  (`anchoringOf`, `setPageAnchoring`, répartition dans `documentChanged` et en fin de déplacement /
  redimensionnement, visée du côté et côté surligné en automatique), `src/engine/render/handles.ts`,
  `src/engine/settings.ts` (`shapes.edgeAnchoring`), `src/engine/spatial.ts` (`spatial.anchoring`),
  `src/app/SettingsPanel.tsx`, `src/app/ContextPanel.tsx` (section Page), `src/app/Viewer.tsx`, `docs/SPEC.md`,
  `tests/engine/edit/distribute.test.ts`. Vérifié dans l'appli (`three-rectangles.drawio`, page en Automatique) :
  deux flèches vers le haut de C à 1/3 et 2/3, une troisième les répartit à 0,25 / 0,5 / 0,75 ; la supprimer revient
  à 1/3 et 2/3 ; déplacer B à gauche de A inverse l'ordre en haut de C ; `make check` vert.
