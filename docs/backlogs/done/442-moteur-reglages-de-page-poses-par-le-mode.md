# Moteur : réglages de page posés par un mode à son arrivée

> Moteur ; demandé par le mode Machine à états (433) ; dépend de 441 (tracé des flèches par page, `spatial.edgeLine`)

- Un mode déclare des réglages de page posés quand une page passe dans ce mode (choix du mode dans le panneau de la
  page, nouvelle page du mode) : ancrage des flèches (`spatial.anchoring`) et tracé des flèches créées
  (`spatial.edgeLine`), par ex. `page.defaults: { anchoring: 'manual', edgeLine: 'straight' }`.
- Ils sont écrits sur la page dans la même étape d'annulation que le passage dans le mode (« Mode … ») ; l'ancrage
  posé répartit les flèches déjà là, comme le choix de l'ancrage dans le panneau. Ensuite, l'utilisateur peut les
  changer comme sur toute page ; rouvrir le document ne les réécrit pas.
- Le mode Machine à états déclare l'ancrage manuel et le tracé droit.
- **Fini quand :** une page passée en mode Machine à états a l'ancrage « Manuel » et le tracé « Droit » dans son
  panneau, une flèche tirée entre deux états est droite ; ⌘Z revient à la page normale avec
  ses réglages d'avant ; on peut ensuite rechoisir un autre ancrage ; `make check` vert.
- Fait : `ModePage.defaults` (`core/modes/types.ts`) écrit par `PageModes.setPageMode` dans l'étape « Mode … »
  (valeurs inconnues ignorées ; l'ancrage posé répartit les flèches s'il les répartit) ; mode Machine à états :
  `{ anchoring: 'manual', edgeLine: 'straight' }`. Doc : `AJOUTER_UN_MODE.md` (contrat, section 6, table des
  garanties). Tests : `tests/engine/core/domains/modes/pageModes.test.ts`. Vérifié dans l'appli (avec l'ancrage
  automatique, avant le passage au manuel) : nouvelle page passée en mode, ancrage et tracé choisis dans le panneau, ⌘Z
  revient à la page normale.
