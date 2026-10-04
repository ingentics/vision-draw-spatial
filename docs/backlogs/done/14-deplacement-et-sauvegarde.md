# Étape 14 — Déplacement et sauvegarde

> Milestone 2 — Editor

- Sélection et déplacement à la souris (en top et en iso, projection sur le sol).
- Écriture in situ des attributs modifiés uniquement.
- Sauvegarde (téléchargement + mise à jour du `FileStore`).
- État de vue par page : enregistrer dans les attributs de la page la position de la caméra et le mode de rendu (`top` / `iso`) avec ses paramètres (orientation, élévation, volumes, épaisseur) ; à l'ouverture d'un fichier ou au retour sur une page, la vue reprend exactement cet état.
- Fait : clic gauche + glisser sur une forme (top et iso, aimanté à la grille, Alt = libre ; groupe déplacé d'un bloc, arêtes reliées retracées en direct) ; `format/edit.ts` réécrit uniquement `x` / `y` du `<mxGeometry>` ; `spatial.view` sur `<diagram>` (`format/viewState.ts`), relu à l'ouverture, réglages iso repris par page ; bouton « Sauvegarder » / Ctrl+S (téléchargement + `FileStore`), pastille de modification, confirmation avant de quitter. Fixture `three-rectangles.drawio` et test du critère §14.4 côté XML.
- Validé avec draw.io 24.7.5 (export en ligne de commande `draw.io -x -f xml`, qui relit et réécrit le fichier) : rectangles aux nouvelles positions, reste identique, `spatial.view` conservé. Procédure manuelle complète : SPEC §15.
- **Fini quand :** le critère d'acceptation SPEC §14.4 est validé dans draw.io, et un fichier sauvegardé puis rouvert (ici comme après un passage dans draw.io) retrouve la même caméra et le même mode de rendu sur chaque page.
