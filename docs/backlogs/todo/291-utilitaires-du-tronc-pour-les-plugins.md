# Utilitaires du tronc repris des plugins

> Architecture du moteur — étanchéité des plugins. Après 287 (exportés par `core/plugins`).

- `spatialFlag(element, key)` à côté de `spatialNumber` (`spatial.ts`) : vrai pour `'1'`. Remplace les
  `spatialValue(x, K) === '1'` des plugins (`tableLayout.ts`, `tableProperties.ts` ; motif interdit par `coding.md`
  §4).
- `spatialJson(element, key, read)` : lecture au mieux d'un attribut `spatial.*` en JSON (texte illisible → valeur par
  défaut, entrées filtrées par `read`). Écriture symétrique : `undefined` pour une liste vide. Remplace les lectures
  à la main de `fieldModel.ts` (`spatial.fields`) et `flows.ts` (`spatial.flows`), sans changer ce qui est écrit.
- `isHexColor(value)` dans `model/styleValues.ts` (`#rrggbb`, casse libre) : remplace les quatre regex
  (`settings/fields.ts`, `flows.ts`, `core/modes/registry.ts`, `format/richText.ts`). `richText.ts` n'accepte
  aujourd'hui que les minuscules : la différence est gardée par un paramètre ou expliquée dans le « Fait : ».
- Chacun a son test dans le miroir de `tests/engine/core/`.
- **Fini quand :** plus de regex de couleur ni de `JSON.parse` d'attribut spatial dans les plugins. Fichiers des
  fixtures RDD et Séquences relus et réécrits à l'identique (test). `make check` vert.
