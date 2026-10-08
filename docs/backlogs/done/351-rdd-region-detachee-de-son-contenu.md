# RDD : déplacer une région sans son contenu (Ctrl)

> Itération — mode RDB Designer (déplacement d'une région), reprise de 182 et 241

- Pendant le glisser d'une région, Ctrl maintenu la détache de son contenu : elle bouge seule, les formes qu'elle
  emporte d'habitude (tables, régions contenues, de proche en proche) restent ou reviennent à leur place ; Ctrl relâché,
  elles la suivent de nouveau. Ctrl garde aussi son rôle de déplacement libre (sans les bornes des régions sœurs,
  sujet 241), ce qui permet de la sortir de sa région parente.
- Lâchée, la région n'a plus pour contenu que ce que son coin haut-gauche désigne à sa nouvelle place (règle de
  `regionOf`) : posée hors de la zone, ses anciens enfants ne sont plus les siens ; ils restent dans la région qui les
  contient (sa parente). Elle n'est pas agrandie pour les reprendre.
- Seulement pour un déplacement sans flèche sélectionnée (cas d'une région prise seule ou avec d'autres formes).
- **Fini quand :** dans l'appli, une région contenant des tables, dans une région parente : glissée avec Ctrl hors de
  la parente, elle part seule ; relâchée, ses tables sont restées dans la parente et ne la suivent plus.
- Fait : le glisser garde deux plans (`MovePlan`, `drag/types.ts`) : avec les formes emportées par le mode, et sans
  (`other`, construit par `GestureDrags.moveDrag` quand le mode emporte quelque chose et qu'aucune flèche n'est
  sélectionnée) ; `MoveDrags.switchPlan` (`drag/move.ts`) les échange quand Ctrl change, remet à sa place ce qui ne
  suit plus, décale ce qui suit de nouveau et retrace les flèches touchées (`moveSetMinus`, `edit/moveSet.ts`, testé).
  Rien de propre au RDD : vaut pour tout mode qui emporte des formes. Ctrl est lu à chaque mouvement du pointeur,
  comme le déplacement libre (sujet 241). Validé à l'œil dans l'appli (`rdd-regions-imbriquees.drawio` : Comptes
  sortie seule de Domaine, User resté ; Ctrl relâché en cours de route, User la rejoint ; Domaine déplacée seule) et
  par l'utilisateur.
