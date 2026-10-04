# Étape 17 — Attributs spatiaux

> Milestone 2 — Editor

- Attributs personnalisés préfixés (ex. `spatial.*`).
- Procédure de test manuelle : ouvrir dans draw.io, sauvegarder, rouvrir, vérifier la conservation.
- Fait : `engine/spatial.ts` (attributs connus, lecture style ou objet) ; `spatial.height` lu aussi sur l'objet, nouveau `spatial.elevation` (forme qui flotte en iso) ; champs « Épaisseur » / « Élévation » dans la barre de sélection (écriture en place, annulable) ; fixture `spatial.drawio`. `make drawio-check` fait réenregistrer les fixtures par draw.io et vérifie la conservation (sorties versionnées dans `tests/fixtures/drawio-saved/`, testées à chaque `make check`) ; procédure manuelle en SPEC §15.
