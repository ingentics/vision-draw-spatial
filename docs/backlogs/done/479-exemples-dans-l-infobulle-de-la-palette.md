# Exemples dans l'infobulle de la palette

> Palette (`PaletteEntry`, `src/app/Palette.tsx`) ; demandé par le mode Event storming (475)

- `PaletteEntry` accepte une aide (`description`) montrée sous le nom dans l'infobulle de la palette.
- Les post-it Event storming y mettent leurs exemples (« Commande passée, Paiement effectué »…), aujourd'hui seulement
  dans les mots-clés de la recherche.
- **Fini quand :** survoler un post-it de la palette d'une page Event storming montre son nom et ses exemples ;
  `make check` vert.
- Fait : `PaletteEntry.description` (`core/shapes/types.ts`), montrée sous le nom dans l'infobulle de la palette
  (`src/app/Palette.tsx`) et cherchée (`searchTemplates`, `core/edit/palette.ts`). Post-it Event storming :
  « Ex. : Commande passée, Paiement effectué »… ; les exemples ne sont plus dans les mots-clés. Tests
  `tests/engine/core/edit/palette.test.ts` (recherche sur l'aide), `tests/engine/plugins/modes/eventstorming/index.test.ts`.
  Vérifié à l'œil : survol du Domain Event dans la palette.
