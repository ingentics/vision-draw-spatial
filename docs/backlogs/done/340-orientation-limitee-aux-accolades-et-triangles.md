# Retourner et pivoter : seulement les accolades et les triangles

> Itération — capacités d'orientation des formes (reprise de 335)

- Seules les **accolades** (gauche et droite) et les **triangles** (vers la droite et vers le haut) déclarent
  `flippable` (horizontal et vertical) et `rotatable`. Les autres formes ne les déclarent pas : la **prise** et les
  **silhouettes** (acteurs), déclarées en 335, les retirent. Elles continuent de s'afficher orientées quand `direction`
  / `flipH` / `flipV` arrivent d'un copier-coller.
- **Fini quand :** les triangles montrent la section « Orientation » et se retournent / pivotent à l'écran (texte
  immobile) ; la prise et l'acteur n'ont plus la section ; `make check` vert.
- Fait : `flippable` et `rotatable` ajoutés à `triangle` (`triangle-up` en hérite) ; retirés de `plug` et de
  `actors/common`. Accolades inchangées. Test de capacités complété (`domains/edit/orient.test.ts`), fixture
  `tests/fixtures/orientation.drawio` : un triangle ajouté, prise et acteur marqués « rien à retourner ». Vérifié dans
  l'appli : le triangle pivote vers le bas en gardant son texte, la prise et l'acteur n'ont plus de section ; `make
  check` vert.
