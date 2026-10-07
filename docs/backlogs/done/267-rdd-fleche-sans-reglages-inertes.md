# RDD : une flèche de relation ne montre que ce qui se modifie

> Itération — panneau d'une flèche de relation RDD ; reprise de 265

- Flèche de relation sélectionnée : les sections en lecture seule ne sont plus affichées (Ligne, Bouts,
  Disposition, Liaison), ni les champs en lecture seule (textes « Début » et « Fin », les cardinalités).
- Restent : « Relation » (Nom inverse), « Texte » (Milieu, Commentaire) et Supprimer.
- **Fini quand :** sur une page RDD, une flèche de relation sélectionnée montre seulement Relation, Texte (Milieu,
  Commentaire) et Supprimer ; une flèche ordinaire garde tout son panneau ; `make check` vert.
- Fait : `src/app/ContextPanel.tsx` — une flèche gérée par le mode (`managesEdge`) a son propre panneau court :
  section du mode, « Texte » (Milieu, Commentaire), Supprimer ; Liaison, simple information, est masquée elle aussi.
  Le verrouillage des sections (`Locked`, `.panel-locked` dans `main.css`) est retiré, devenu inutile. Vérifié dans
  l'appli : flèche User → Role, panneau réduit à Relation, Texte et Supprimer ; une flèche ordinaire inchangée.
