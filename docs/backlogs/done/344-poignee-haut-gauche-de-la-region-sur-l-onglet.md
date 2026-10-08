# Poignée haut-gauche d'une région sur son onglet

> Itération — mode RDD, région sélectionnée (reprise de 227 et 330)

- La poignée de redimensionnement haut-gauche (`nw`) d'une région nommée est dessinée et prise au coin haut-gauche de
  son onglet (au-dessus du coin de la région, de la hauteur de l'onglet). Elle redimensionne comme avant : la tirer
  déplace le coin haut-gauche de la région, l'onglet suit.
- Sans nom (pas d'onglet) : la poignée reste au coin de la région. Les autres poignées ne bougent pas.
- **Fini quand :** dans l'appli, une région sélectionnée montre sa poignée haut-gauche au coin de l'onglet ; la tirer
  redimensionne la région par son coin haut-gauche ; une région sans nom garde sa poignée au coin.
- Fait : champ `movedHandles` des définitions de forme (`shapes/types.ts`, lu par `registry.movedHandles`) : poignées
  de redimensionnement placées hors des bornes, passées à `handlePoints` (`edit/handleKinds.ts`) pour le dessin
  (`render/handleMeshes.ts`, `selection/highlight.ts`) et la prise (`edit/shapeHandles.ts`) ; la région y met `nw` au
  coin de son onglet (`rdd/shapes/region/index.ts`). Le redimensionnement part du déplacement du pointeur : inchangé.
  Vu dans l'appli (`rdd-regions-imbriquees.drawio`, région « Comptes ») ; tests `handleKinds.test.ts` et
  `region.test.ts`. `make check` vert.
