# Mot de la tranche en façade en iso / 3D

> Itération — formes (Architecture) ; reprise de 151

- En iso / 3D, le mot d'un process étiqueté (CONSUMER, TASK, CRON, PROCESS ou `spatial.tag`) quitte le dessus du
  bloc : il s'écrit sur les quatre faces, en bas à droite de chacune, comme l'étiquette de façade des bâtiments
  (BDD, file, cache : même taille selon la hauteur, même teinte, à l'endroit vu de l'extérieur). La ligne de la
  tranche reste sur le dessus. Le réglage « Étiquettes de façade » (`view.facadeTags`) les coupe aussi.
- Sans volume (pas de fond), le mot reste dans la tranche, comme en 2D.
- **Fini quand :** en iso et en 3D, le mot apparaît en bas à droite de chaque face du bloc et plus sur le dessus ;
  `make check` vert.
- Fait : `shapes/generic/tagged-process/index.ts` : rendu iso propre (`isoTagged`) : bloc avec les seules lignes sur
  le dessus, puis le mot posé par `facadeTag` des bâtiments (taille `tagSize` selon la hauteur, `tagOf` : réglage des
  étiquettes de façade) ; sans volume, le rendu avec le mot dans la tranche. SPEC §8.3 à jour. Vérifié dans l'appli
  en iso : « API » en bas à droite des faces visibles, plus rien sur le dessus que la ligne de la tranche.
