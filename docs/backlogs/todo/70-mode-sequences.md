# Mode de page « Séquences »

> Thème — comportements de page ; dépend de 69 (modes de page)

Une page en mode Séquences (`spatial.mode=sequences`) enregistre des **flux** et l'ordre des flèches dans chacun, de
quoi en déduire plus tard un diagramme de séquence par flux. Dans draw.io, rien ne change. Le rendu du diagramme de
séquence n'est pas traité ici ; les formes ne reçoivent rien.

- **Où :** `src/engine/modes/sequences/` (flux, règles des rangs, opérations, habillage, remise en ordre) et
  `src/app/modes/sequences/` (section « Flux » du panneau de la page : affichage et appels aux opérations). Les champs
  « Flux » et « Rang » d'une flèche sont des réglages déclarés (liste de choix, nombre).
- **Flux (page)** : `spatial.flows` sur `<diagram>`, liste ordonnée en JSON
  `[{"id":"f1","title":"Connexion","color":"#4e79a7"}, …]`. L'`id` est stable (renommer ne touche pas les flèches) ;
  l'ordre du tableau est l'ordre des flux.
- **Panneau de la page** : ajouter, renommer (titre), supprimer, réordonner les flux ; nombre de flèches par flux.
  À la création, la couleur est prise dans une suite fixe de couleurs (la première qui n'est pas déjà utilisée), puis
  enregistrée : réordonner ou supprimer un flux ne change pas la couleur des autres.
- **Flèche** : une flèche appartient à un seul flux au plus : `spatial.flow=<id>` et `spatial.step=<rang>` (à partir
  de 1). Panneau d'une flèche : liste « Flux » (« Aucun » + les flux) et champ « Rang ».
- **Rangs toujours consécutifs** dans un flux (1…n), chaque opération étant une seule action annulable :
  - ajoutée à un flux, une flèche prend le rang n + 1 ;
  - changer son rang l'échange avec la flèche qui l'occupait ;
  - retirée du flux (ou changée de flux, ou supprimée), les rangs suivants sont resserrés ;
  - supprimer un flux retire `spatial.flow` et `spatial.step` de ses flèches.
- **Copier-coller** : la copie perd `spatial.flow` et `spatial.step`.
- **Incohérences** (fichier modifié dans draw.io : trous, doublons, flux inconnu) : remise en ordre au mieux à la
  lecture (tri par rang, puis par ordre de dessin, renumérotation à partir de 1 ; flux inconnu = sans flux),
  signalée dans le panneau Diagnostics, enregistrée à la prochaine modification du flux.
- **Habillage** (seulement quand le mode est actif ; flèche sans flux inchangée) :
  - pastille ronde, fond de la couleur du flux, rang écrit en blanc ou noir selon le contraste, posée au-dessus du
    texte du milieu de la flèche ; sans texte, une pastille plus petite au milieu de la flèche ; face à la caméra en
    iso / 3D ;
  - trait et pointe de la flèche dans la couleur du flux assombrie (≈ −25 % de luminosité) ; le texte garde sa
    couleur ; le style draw.io n'est pas modifié.
- **Fini quand :** sur une page passée en mode Séquences, on crée trois flux, on y range des flèches : couleurs et
  pastilles s'affichent (avec et sans texte, en 2D et en iso) ; les rangs restent consécutifs après échange,
  retrait, changement de flux, suppression de flèche ou de flux, et annulation ; un collage ne crée pas de doublon ;
  après un réenregistrement par draw.io, la page se rouvre à l'identique et les flèches y sont normales ;
  `make check` vert.
