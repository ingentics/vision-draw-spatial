# RDD : ajuster une région à son contenu (touche « f »)

> Milestone — mode RDD ; dépend de 182 (région)

- Région sélectionnée seule, **`f`** l'ajuste à son contenu : rectangle englobant des formes qu'elle contient,
  plus la marge de sécurité (20 px) de chaque côté — le nom est sur l'onglet, au-dessus de la région (sujet 227) :
  pas de place à lui garder dedans ; elle grandit ou rétrécit. Une étape
  d'annulation, libellée « Ajuster la région ». Région vide : rien ne change.
- Touche du mode (`keys` de `PageModeDefinition`) : elle n'agit que sur une région et laisse `f` à la variante de
  placement d'une flèche sélectionnée.
- **Fini quand :** sur une région trop grande puis trop petite pour ses tables, `f` la ramène autour d'elles avec
  20 px de marge sous le label ; sur une flèche, `f` garde son effet ; `make check` vert.
- Fait : `fitRegion` (`rdd/regions.ts`) : englobant du contenu (`regionContent`, régions incluses) plus
  `REGION.margin` de chaque côté, écrit par `setShapeBounds`, puis ordre des régions remis en place ; rien pour une
  région vide. Touche `f` du mode (`keys`, « Ajuster la région »), qui ne s'applique qu'à une région : ailleurs, la
  touche passe à la variante de placement (les touches du mode sont lues avant). Tests `rdd.test.ts` (trop grande,
  trop petite, vide, autre forme). SPEC §14.5. Vérifié dans l'appli : `f` ramène la région autour de ses tables.
