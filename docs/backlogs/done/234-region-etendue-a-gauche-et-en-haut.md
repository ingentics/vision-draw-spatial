# RDD : la région s'étend aussi quand son contenu sort par la gauche ou le haut

> Itération — mode RDD (région) ; reprise de 183

- Une forme qui était dans une région et qu'on déplace en la faisant sortir par la gauche ou le haut (son coin
  haut-gauche passe hors de la région, mais elle la chevauche encore) reste dans la région, qui s'agrandit vers la
  gauche et / ou le haut pour la contenir avec la marge de 20 px ; même étape d'annulation que le déplacement. Les
  régions englobantes suivent, dans les quatre directions.
- Une forme déplacée entièrement hors de sa région, ou dont le coin entre dans une autre région qui n'englobe pas la
  sienne, la quitte (rien ne s'agrandit).
- **Fini quand :** une table tirée en partie hors de sa région par la gauche ou le haut agrandit la région de ce côté
  avec 20 px de marge ; tirée complètement dehors, elle en sort ; ⌘Z défait les deux ensemble ; `make check` vert.
- Fait : `growRegions` (`rdd/regions.ts`) reçoit la page d'avant le déplacement : la région d'une forme est celle de
  son coin, sauf si la forme était dans une autre qu'elle chevauche encore et que son coin n'est pas entré dans une
  région qui n'englobe pas celle-ci (`encloses`) ; la région s'agrandit dans les quatre directions, en gardant la
  marge de chaque côté trop proche. Cadre : `placed(edit, shapeIds, before)`, page d'avant reconstruite par
  `PageModes.shapesPlaced` (formes déplacées décalées de `-applied`, passées par `MoveDrags.commit`). Tests
  `rdd.test.ts` (sortie par la gauche et le haut, région englobante, sortie complète). SPEC §14.5,
  `AJOUTER_UN_MODE.md`. Vérifié dans l'appli : Role tirée hors du haut de « Comptes » agrandit la région vers le haut ;
  ⌘Z défait les deux.
