# Déplacer la sélection aux flèches du clavier

> Itération — édition (déplacement) ; reprise de 14

- Sur une page modifiable, avec une sélection (formes, et flèches sélectionnées avec elles), les flèches du clavier
  déplacent la sélection au lieu de la vue : 1 px par appui, un pas de grille avec Maj (calé sur la grille), comme
  draw.io. Mêmes règles qu'au glisser : formes verrouillées immobiles, bout de flèche détaché si sa forme ne bouge
  pas, ancrage automatique appliqué. Un appui = une étape d'annulation ; la touche maintenue répète.
- Le déplacement suit les axes de la page. Sans sélection (ou dans un champ, en édition de texte), les flèches
  gardent leur rôle actuel ; Z Q S D déplacent toujours la vue.
- **Fini quand :** une forme sélectionnée bouge de 1 px par flèche, d'un pas de grille avec Maj, ses flèches
  suivent, ⌘ Z annule ; sans sélection, les flèches déplacent la vue ; `make check` vert.
- Fait : `Engine.nudgeSelection()` construit le déplacement de la sélection avec le même code que le glisser
  (`moveDrag`, extrait de `beginMove`), puis l'applique et l'écrit (`dragMove`, `endMove`) : une étape d'annulation
  par appui, ancrage automatique compris. `CameraController` l'appelle sur ← ↑ → ↓ sans modificateur (Maj = pas de
  grille) et ne déplace la vue que si rien n'a bougé. Vérifié dans l'appli sur `fixtures/simple.drawio` : « DB »
  déplacée de 8 pas de grille et de 20 px, « Service » déplacée avec sa flèche retracée comme au glisser, ⌘ Z
  annule ; sans sélection, les flèches déplacent la vue.
