# Moteur : courant figé pendant l'édition du texte d'une partie

> Itération — moteur, courant d'un mode et texte des parties ; dette vue à l'audit 421 (reprise de 414)

- Constat : `ShapeParts.setText` remet au mode le courant du moment où la saisie est validée, pas celui de l'ouverture
  de l'éditeur (l'appli ferme l'éditeur puis appelle `setPartText`) ; si le courant changeait éditeur ouvert, un nom
  saisi en couche physique RDD serait écrit comme nom logique. Pas reproductible aujourd'hui (Tab dans l'éditeur ne
  bascule pas, un clic sur la barre valide d'abord).
- Ce qu'on veut : tant que le texte d'une partie est en édition sur une page, le courant de son mode ne change pas
  (`setModeCurrent`, `pickModeCurrent` sans effet ; barre, Tab et touches de page suivent). Le texte, l'aperçu, le
  cadre de l'éditeur et l'écriture voient ainsi tous le courant de l'ouverture. Rien dans l'appli.
- Écart de comportement : aucun visible (le cas n'est pas atteignable à la souris ni au clavier aujourd'hui).
- Tests : `modeCurrents.test.ts` (courant inchangé pendant l'édition d'une partie, changé après ; le texte d'une
  forme en édition ne bloque pas).
- Doc : `AJOUTER_UN_MODE.md` (courant).
- **Fini quand :** testé dans le moteur ; dans l'appli, en couche physique, l'édition sur place du titre et d'un
  champ écrit toujours le `dbName`, Tab et la barre basculent comme avant hors édition.
- Fait : `ModeCurrents.frozen(pageId)` (`core/domains/modes/modeCurrents.ts`) : vrai quand l'éditeur en place
  (`labelEditor.editing`) tient le texte d'une partie sur la page ; `setModeCurrent` et `pickModeCurrent` sont alors
  sans effet (barre, Tab, touches de page et clic passent par eux). Le texte de la forme en édition, ou une partie
  d'une autre page, ne bloque rien. Doc : `AJOUTER_UN_MODE.md` (courant). Tests : `modeCurrents.test.ts` (courant
  inchangé pendant l'édition d'une partie, par `setModeCurrent` comme par `pick` ; changé pour le texte de la forme ou
  une autre page ; le mode de test a maintenant un `pick`). Aucun écart visible. `make check` vert. Vérifié dans
  l'appli (`rdd-couches.drawio`) : en couche physique, édition sur place du champ `nickname` → `dbName` « nick_name »,
  nom logique intact en couche logique, Tab bascule comme avant hors édition, annulé. Le gel lui-même (courant changé
  éditeur ouvert) n'est pas atteignable dans l'appli : vérifié seulement par les tests.
