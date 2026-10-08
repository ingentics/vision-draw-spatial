# Pas de mode navigation sur la vue graphe

> Itération — mode navigation (touche pour suivre un lien), vue graphe (SPEC §12)

- Sur la vue graphe, maintenir la touche pour suivre un lien (`controls.followLinkKey`) ne déclenche plus le mode
  navigation : pas d'aide « Mode navigation » en bas, pas de zones liées autour des nœuds, et touche + clic sur un
  nœud n'y plonge pas. Le double-clic sur un nœud plonge toujours.
- La touche reste connue : maintenue pendant une plongée depuis la vue graphe, le mode navigation s'active à
  l'arrivée sur la page (comme le sujet 356) ; maintenue en partant vers la vue graphe, il s'arrête dès le début de
  la transition.
- **Fini quand :** dans l'appli, sur `fixtures/parent-pages.drawio`, maintenir Espace sur la vue graphe n'affiche ni
  « Mode navigation » ni zones liées ; sur une page, le mode navigation marche comme avant ; un test le vérifie.
- Fait : `src/engine/core/domains/input/keys.ts` ne compte la touche pour suivre un lien (aide « Mode navigation »,
  zones liées) que hors de la vue graphe ; `refresh()` réévalue à chaque changement de page courante
  (`pages.setCurrent`, `pages.arriveAt`), d'où l'arrêt dès le début d'une transition vers la vue graphe et la reprise
  à l'arrivée d'une plongée. `pointerInput.handleClick` ne suit plus de lien par touche + clic sur la vue graphe.
  Test : `tests/engine/core/domains/input/keys.test.ts`. Vérifié dans l'appli (`fixtures/parent-pages.drawio`) :
  Espace maintenue sur la vue graphe n'affiche rien ; sur une page, « Mode navigation » ; maintenue pendant l'aller
  vers la vue graphe, l'aide disparaît dès le départ, et revient à l'arrivée sur la page au retour.
