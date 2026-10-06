# RDD : une région est dans une autre comme une table, quelle que soit sa taille

> Itération — mode RDD (région) ; reprise de 182 et 183

- Une région est dans une autre dès que son coin haut-gauche y est, comme une table, même si elle est aussi grande
  ou plus grande (avant : seulement dans une région plus grande). Posée en mordant sur le bord de sa parente, elle
  l'agrandit (sujet 183) ; déplacer la parente l'emporte.
- Seul cas ambigu, deux coins haut-gauche au même point : la plus grande est la parente, à taille égale celle de
  derrière. Une forme dans plusieurs régions appartient à la plus petite, à taille égale à celle de devant.
- **Fini quand :** deux régions de la taille par défaut, l'une posée en mordant sur le bord de l'autre, l'agrandit ;
  `make check` vert.
- Fait : `regionOf` (`rdd/regions.ts`) : une région est candidate dès que son coin y est (`canContainRegion` : seul le
  cas des coins confondus départage, par la taille puis l'ordre de dessin) ; parmi les candidates, la plus petite, à
  taille égale celle de devant. L'agrandissement (sujet 183) et l'ordre (sujet 230) suivent sans changement. Tests
  `rdd.test.ts` (région de la taille de sa parente posée en mordant : la parente grandit ; coins confondus). SPEC
  §14.5. Vérifié dans l'appli : trois régions de la taille par défaut posées en mordant l'une sur l'autre s'emboîtent,
  les parentes s'agrandissent.
