# Survol d'une flèche coupée : ligne entre les coupures ; renvois en direct

> Itération — flèches coupées ; reprise de 224 et 219

- La ligne directe du survol relie les deux bouts coupés (fin du tronçon de départ et fin du tronçon d'arrivée), et
  non plus le départ et l'arrivée de la flèche.
- Avec un cadre de renvoi, elle part du bord du cadre tourné vers l'autre bout (côté le plus proche de la cible),
  pas du bout du tronçon.
- Elle passe à 30 % d'opacité (au lieu de 80 %).
- Les champs « Renvoi départ / arrivée » modifient la flèche en direct pendant la frappe (une étape d'annulation par
  passage dans le champ).
- **Fini quand :** au survol d'une flèche coupée, la ligne directe, noire à 30 %, va du bout du tronçon de départ au
  bout du tronçon d'arrivée (bord du cadre tourné vers l'autre bout s'il y a un renvoi) ; un texte de renvoi tapé
  s'affiche à chaque frappe ; `make check` vert.
- Fait : `render/edges/edge.ts` calcule les bouts de la ligne directe (`userData.splitHover.ends`) : fin de chaque
  tronçon, ou, avec un cadre, sortie du cadre depuis son centre vers l'autre bout (`splitLabelFrame`) ; ligne à 30 %
  (`render/edges/split.ts`). Champs de renvoi (`app/ContextPanel.tsx`) : `onLive` à chaque frappe, fusionnés en une
  étape d'annulation par passage (clé de fusion), champ non remonté pendant la frappe (le focus reste). Test mis à
  jour (`tests/engine/render/edges/split.test.ts`). Vérifié dans l'appli sur la ligne pointillée de `simple.drawio` :
  « vers Stockage » apparaît pendant la frappe, au survol la ligne grise part du bord droit du cadre et rejoint la
  coupure du tronçon d'arrivée ; deux annulations rendent la flèche d'origine.
