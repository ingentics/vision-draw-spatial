# Étape 13 — Conservation de l'arbre XML

> Milestone 2 — Editor

- Conserver l'arbre XML d'origine à côté du modèle neutre, avec correspondance id ↔ nœud.
- Test d'aller-retour : `parse → write` sans modification = XML sémantiquement identique.
- Fait : `format/xmlTree.ts` (arbre, `cells` id → `<mxCell>` / enveloppe / `<mxGeometry>`, forme de chaque page), `readDrawio` construit le modèle à partir de cet arbre, `format/write.ts` resérialise l'arbre (pages compressées intactes recopiées telles quelles, modifiées recompressées). L'`Engine` garde l'arbre à côté du modèle. Fixture `roundtrip.drawio` (commentaires, éléments et attributs inconnus, entités, `UserObject`).
- **Fini quand :** les tests d'aller-retour passent sur toutes les fixtures.
