# RDD : le contenu d'une région est dessiné devant elle

> Itération — mode RDD (région) ; reprise de 182 et 183

- Tout élément contenu dans une région est devant elle dans l'ordre de dessin (ordre des cellules du fichier), et
  de même pour une région dans une région, à toute profondeur : les régions passent au fond de la pile, les plus
  englobantes derrière, chaque région devant celle qui la contient.
- Remis en ordre quand une forme du mode est posée (déplacée ou ajoutée), dans la même étape d'annulation.
- **Fini quand :** une région déplacée dans une autre passe devant elle, ses tables devant les deux ; une table posée
  dans une région est devant elle ; draw.io garde cet ordre ; `make check` vert.
- Fait : `orderRegions` (`rdd/regions.ts`) : régions triées par profondeur (`depthOf`, chaîne de `regionOf`), à égalité
  dans l'ordre en place, envoyées au fond par `ModeEdit.sendToBack` (`format/order.ts` : `sendToBackInOrder`, rien
  si l'ordre est déjà bon) ; appelé avec l'agrandissement du sujet 183 (`placeInRegions`, crochet `placed`).
  Correction au passage : les formes emportées par une région (`DragGesture.carried`) n'étaient trouvées que si la
  région était la première forme de la page (`stack.pop()` appelé dans le `find`), ce que le nouvel ordre a révélé.
  Tests `rdd.test.ts` (ordre grande région, autre région, petite région, table ; rien si déjà en ordre). SPEC §14.5.
  Vérifié dans l'appli : régions déplacées avec leur contenu, contenu devant ; ordre relu du fichier.
