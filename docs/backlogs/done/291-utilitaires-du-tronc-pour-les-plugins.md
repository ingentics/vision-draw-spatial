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
- Fait :
  - `spatialFlag(element, key)` (`core/spatial.ts`) remplace les `spatialValue(…) === '1'` de `tableLayout.ts` et
    `tableProperties.ts`. Les `=== '1'` qui restent lisent la valeur d'une case du panneau, pas un attribut.
  - Écart de nom : `spatialJson(element, key, read)` est devenu `readJsonList(text)` et `jsonListValue(items)`
    (`core/spatial.ts`), parce que les flux sont un attribut de page (`page.attributes`) et non une valeur de
    `spatialValue` :
    - lecture au mieux (`undefined` si le texte n'est pas une liste JSON, liste vide s'il est absent) ;
    - écriture qui renvoie `undefined` pour une liste vide.

    Ils remplacent les lectures et écritures à la main de `fieldModel.ts` (`spatial.fields`) et `flows.ts`
    (`spatial.flows`).
  - `isHexColor(value)` (`core/model/styleValues.ts`, garde de type `value is string`) remplace six copies de la regex :
    `settings/fields.ts`, `settings/pluginSettings.ts`, `flows.ts`, `format/richText.ts`, et dans l'appli
    `TextFormat.tsx` et `BorderSection.tsx`.
    - `richText` passait la valeur en minuscules avant sa regex sensible à la casse : pas de vraie différence.
      `parseColor` teste désormais la forme longue en dernier ; les trois formes s'excluent, le résultat est le même.
    - Les appelants qui reçoivent une valeur `unknown` vérifient d'abord `typeof value === 'string'`.
  - Exportés par l'API des plugins (`spatialFlag`, `readJsonList`, `jsonListValue`, `isHexColor`), et `isHexColor`
    par le point d'entrée du moteur.
  - Tests :
    - `tests/engine/core/model/styleValues.test.ts` : `isHexColor` ;
    - `tests/engine/core/spatial/helpers.test.ts` : drapeau, listes JSON, et relecture / réécriture à l'identique
      des flux de `sequences.drawio` et des listes de champs de `rdd.drawio`.

    Pour RDD, c'est la liste brute qui est comparée : le mode normalise certains champs à la lecture (type de la clé
    primaire), comme avant.
  - Validation :
    - `make check` vert (109 fichiers, 2042 tests) ;
    - dans l'appli, les trois flux de `sequences.drawio` sont lus (noms et couleurs) et la page RDD s'affiche avec
      ses 2 diagnostics habituels.
