# `make drawio-check` cite un test qui n'existe pas

`Makefile` (cible `drawio-check`) lance `tests/engine/core/edit/edgePointsFixture.test.ts`, qui n'existe pas. Le
fichier s'appelle `edgePointEditsFixture.test.ts` : ce test de conservation n'est donc pas rejoué après le
réenregistrement par draw.io.

Fait :
- `Makefile` (`drawio-check`) : la liste écrite à la main est remplacée par tous les tests qui lisent
  `tests/fixtures/drawio-saved/` (`grep -rl drawio-saved tests`). Le test absent est remplacé par le bon
  (`edgePointEditsFixture`), et trois tests qui comparaient déjà avec les exports SVG mais n'étaient pas relancés
  rejoignent la liste : `anchorRoutingFixture`, `anchorAutoRoutingFixture`, `jumps`. Un nouveau test de comparaison
  sera pris sans toucher au `Makefile`.
- Validation : `make drawio-check` lancé avec le draw.io de la machine. 9 fichiers, 1156 tests verts, dont la
  conservation de la fixture `rdd-regions-imbriquees.drawio` (sujet 288), dont la sortie draw.io est ajoutée.
