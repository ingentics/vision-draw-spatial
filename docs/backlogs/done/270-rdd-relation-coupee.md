# RDD : couper une flèche de relation, avec ses renvois

> Itération — panneau d'une flèche de relation RDD ; reprise de 267 (et de 219, flèche coupée en deux)

- Une flèche de relation (entre tables ou embedded) peut être coupée en deux comme toute flèche : son panneau court
  gagne une section « Tracé » réduite à la case « Couper la flèche » (`split=1`) et, cochée, aux champs « Renvoi
  départ » / « Renvoi arrivée » (`splitLabelLeft`, `splitLabelRight` ; vide = fondu), les mêmes que pour une flèche
  ordinaire.
- Le reste du panneau ne change pas (Relation, Texte, Supprimer) ; les bouts restent imposés par la sorte de relation.
- **Fini quand :** sur une page RDD, une flèche de relation sélectionnée se coupe depuis son panneau, montre ses deux
  tronçons (avec pointes et cardinalités pour une relation entre tables), et prend des renvois ; une flèche ordinaire
  garde son panneau complet ; `make check` vert.
- Fait : `src/app/ContextPanel.tsx` — la case « Couper la flèche » et les renvois sortent de la section « Tracé » dans
  leur propre composant (`EdgeSplitFields`), repris tel quel par la section « Tracé » d'une flèche ordinaire et par le
  panneau court d'une flèche gérée par le mode (`managedEdge`). Aucun changement côté moteur : le style d'une flèche
  gérée n'était pas verrouillé. Vérifié dans l'appli : User → Orphan coupée, deux tronçons en fondu avec pointes ER
  et « 0,n » / « 0,1 », renvois « vers Orphan » / « de User » dans leurs cadres ; une flèche ordinaire garde sa
  section « Tracé » complète (vérifié par lecture seulement). Relation embedded : même panneau, non regardée à
  l'œil.
