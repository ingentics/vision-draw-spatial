# `make drawio-check` cite un test qui n'existe pas

`Makefile` (cible `drawio-check`) lance `tests/engine/core/edit/edgePointsFixture.test.ts`, qui n'existe pas. Le
fichier s'appelle `edgePointEditsFixture.test.ts` : ce test de conservation n'est donc pas rejoué après le
réenregistrement par draw.io.
