# Machine à états : transitions entre états

> Milestone — mode Machine à états ; dépend de 438 (bouts attachés), 433 (et de 435 pour les ensembles)

- **Périmètre** : code moteur dans `src/engine/plugins/modes/states/` et appli dans `src/app/plugins/modes/states/`
  seulement, plus `tests/`, `fixtures/states.drawio` et la doc (SPEC, SUMMARY, `AJOUTER_UN_MODE.md` si besoin).
  Aucun changement dans `src/engine/core/` : un besoin du tronc découvert en route devient un ticket moteur à part.
- Une **transition** est une flèche du mode entre deux états (un état, un ensemble, ou une forme et elle-même :
  boucle, déjà gérée par le moteur) : flèche classique (`endArrow=classic`, trait plein), style de tracé par défaut
  de l'appli.
- **Bouts** : seuls les états, les ensembles et les points d'entrée / de sortie acceptent un bout (point d'extension
  `connects`, comme les relations RDD 265) ; un point d'entrée n'est que **départ**, un point de sortie que
  **cible** ; pas de boucle sur eux ; Texte, Titre et Post-it ne se connectent pas. Une transition peut aller d'un
  état vers un ensemble, d'un ensemble vers un état, entre ensembles, et traverser le bord d'un ensemble (état
  dedans → état dehors).
- **Pas de bout libre** : le mode déclare `edges.attachedEnds` (sujet 438) : une flèche lâchée dans le vide ou sur
  une forme refusée n'est pas créée, un bout rebranché dans le vide revient à sa place. Une transition à bout libre
  venue d'ailleurs (collage, fichier modifié) est signalée dans Diagnostics (`lifecycle.check`).
- **Nom** de la transition : le texte du milieu de la flèche (édition comme toute flèche) ; sans nom, rien n'est
  affiché. Panneau de la flèche : section « Transition » en tête avec le nom ; les réglages sans effet dans le mode
  (bouts, position des textes, lien) masqués ;
  le commentaire reste (touche « C », bouton du panneau, encart au survol).
- **Vers une sortie en erreur** (sujet 433) : la transition est dessinée en rouge (`#d32f2f`, habillage du mode,
  le fichier n'est pas modifié) ; elle redevient noire si la sortie redevient attendue.
- **Fini quand :** sur la fixture, une flèche tirée d'un état à un autre est créée avec une pointe classique, son nom
  s'affiche au milieu une fois saisi ; point d'entrée → état et état → point de sortie
  marchent, l'inverse est refusé ; tirée vers un post-it ou dans le vide, elle n'est pas créée ; une boucle sur
  un état est possible ; `make check` vert.
- Fait : `transitions/transitionRules.ts` (`canConnect`, Diagnostics des bouts libres et liaisons refusées, section
  « Transition » du panneau), `edges.attachedEnds`, `edges.manages` sur toutes les flèches (texte du milieu,
  commentaire, coupure ; le reste masqué), pointe classique et trait plein à la création ; flèches vers une sortie en
  erreur en rouge par l'habillage. Écart : la section « Transition » montre les deux bouts en lecture seule, le nom se
  saisit dans Texte › Milieu juste dessous (un mode ne peut pas écrire le texte d'une flèche). Vérifié dans l'appli :
  flèche vers un post-it ou dans le vide non créée, flèche d'un état vers un état d'un ensemble créée ; boucle et
  règles des points par les tests.
