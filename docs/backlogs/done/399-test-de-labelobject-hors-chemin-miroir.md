# Test de labelObject au chemin miroir

> Itération — tests du rendu ; dette vue au sujet 383

- Le test de `labelObject` (`render/flat/box.ts`) passe de `tests/engine/core/render/labelObject.test.ts` à
  `tests/engine/core/render/flat/box.test.ts` (chemin miroir), à côté de celui de `textAnchors`. Avec le sujet 398, il
  vérifie aussi un texte sans cellule porteuse.
- **Fini quand :** `labelObject.test.ts` n'existe plus, son test est dans `box.test.ts` ; `make check` vert.
- Fait : test de `labelObject` déplacé dans `tests/engine/core/render/flat/box.test.ts`, plus le cas sans cellule
  porteuse (sujet 398) ; `labelObject.test.ts` supprimé.
