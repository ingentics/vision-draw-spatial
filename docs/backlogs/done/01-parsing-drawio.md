# Étape 1 — Parsing draw.io

> Milestone 1 — Viewer

- `decode.ts` : base64 → inflate raw → URI decode.
- `style.ts` : parsing des chaînes de style.
- `parse.ts` : `<mxfile>` → `DocumentModel` (pages, formes, arêtes, liens, coordonnées absolues avec groupes).
- Fixtures : fichier simple, compressé, multi-pages, groupes imbriqués, liens entre pages.
- **Fini quand :** tests unitaires verts sur toutes les fixtures.
