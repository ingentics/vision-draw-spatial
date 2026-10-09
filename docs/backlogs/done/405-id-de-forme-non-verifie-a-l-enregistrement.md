# Id d'une forme vérifié à l'enregistrement

> Itération — registre des formes (`core/shapes/registry.ts`) ; dette vue au sujet 390

- `ShapeRegistry.register` refuse (exception) un id hors de `PLUGIN_ID_PATTERN` (`^[a-z][a-z0-9-]*$`), comme les
  registres des modes et des effets (sujet 378) : une forme est désignée par `spatial.kind`, écrit dans le fichier.
- `docs/AJOUTER_UN_PLUGIN.md` section 2 : la vérification vaut pour les trois sortes de plugins (plus d'exception pour
  les formes ; le test id = dossier reste).
- **Fini quand :** enregistrer une forme d'id `Box` ou `1box` lève une exception ; toutes les formes livrées
  s'enregistrent ; `make check` vert.
- Fait : `ShapeRegistry.register` (`core/shapes/registry.ts`) refuse un id hors de `PLUGIN_ID_PATTERN` ; test dans
  `tests/engine/core/shapes/registry.test.ts` ; `docs/AJOUTER_UN_PLUGIN.md` section 2 sans exception pour les formes.
  Toutes les formes livrées passent (tests).
