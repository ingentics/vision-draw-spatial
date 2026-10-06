# Point d'entrée public du moteur

> Idée — dette technique du moteur (API) ; prépare 208

- L'app importe une quarantaine de chemins internes du moteur (`engine/interaction/camera`, `engine/edit/styles`,
  `engine/render/edges/jumps`…), alors que `src/index.ts` annonce que le reste est interne.
- Un `engine/index.ts` (ou quelques points d'entrée publics) que l'app utilise seul : les déplacements de fichiers
  internes ne la touchent plus.
