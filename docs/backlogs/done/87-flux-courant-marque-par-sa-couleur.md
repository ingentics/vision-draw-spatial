# Flux courant marqué sur sa pastille de couleur ; plus de ↑ ↓

> Itération — mode Séquences (panneau « Flux ») ; reprise de 79 et 70

- Dans la section « Flux » du panneau de la page, le flux courant est marqué par un cercle autour de sa pastille de
  couleur, et non plus par le cadre du champ de son nom.
- Les boutons ↑ ↓ (réordonner les flux) sont retirés.
- **Fini quand :** sur `sequences.drawio`, la pastille du flux courant est cerclée, les champs de nom sont tous
  identiques, plus de ↑ ↓ ; `make check` vert.
- Fait : `app/modes/sequences/index.tsx` (boutons ↑ ↓ et leurs props retirés, aide mise à jour avec espaces
  insécables dans « + » / « - »), `main.css` (`.flow-item.current .color-dot` : cercle de la couleur du texte autour
  de la pastille, au lieu du cadre du champ), SPEC §14.5. L'opération `moveFlow` reste dans la lib (testée), sans
  bouton. Vérifié dans l'appli sur `sequences.drawio`.
