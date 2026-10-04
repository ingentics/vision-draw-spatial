# Étape 15 — Palette et création

> Milestone 2 — Editor

- Palette de formes, glisser-déposer sur le plan.
- Nouveau fichier depuis un squelette vide, ajout / suppression / renommage de pages.
- Fait : palette à gauche (rectangle, rectangle arrondi, ellipse, cercle, texte : styles et tailles par défaut de draw.io, seulement des formes dessinées par le moteur) ; glisser-déposer au point visé, projeté au sol (top et iso), aimanté à la grille ; clic = ajout au centre de la vue. `format/create.ts` ajoute cellules (ids à la draw.io, premier calque, créé au besoin) et pages dans l'arbre, en reprenant l'indentation ; le modèle est relu de l'arbre (`documentFromTree`). Onglets : + (nouvelle page), double-clic (renommer), × (supprimer, avec confirmation). Une page vide est cadrée sur le haut de la feuille draw.io (coordonnées positives).
- Validé avec draw.io 24.7.5 : un fichier créé de zéro (deux pages, rectangle, ellipse, texte) se rend correctement à l'export PNG et se relit sans perte (`spatial.view` compris).
- **Fini quand :** un schéma créé de zéro s'ouvre correctement dans draw.io.
