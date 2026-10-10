# Avertissements sur les post-it

> Itération — mode Event storming, reprise de 518 (avertissements W1 à W8) et de 516 / 517 (icône « Je ne sais pas »)

- **Pastille** en haut à gauche du post-it, 20 × 20 à 7 des bords haut et gauche, quand il a au moins un
  avertissement de la lecture du mur (`readWall`, W1 à W8 ; W1 et W8 sur les deux post-it concernés) : triangle à fond
  jaune (`#ffd54f`), contour et « ! » noirs. Le label du type commence après elle (réduit s'il ne tient plus).
- **Pivot « Je ne sais pas »** (Domain Event, `spatial.es.pivot=unknown`) : à la place, une pastille ronde à fond bleu
  (`#42a5f5`) et « ? » blanc ; l'icône « ? » en haut à droite (sujet 517) n'est plus dessinée (le cube de Oui reste).
- **Survol ou clic** de la pastille : son message dans l'encart des commentaires (en bas à gauche), titre en gras puis
  ce qui est attendu, avec un exemple. Contact sans règle (W1), post-it isolé (W7) et chevauchement (W8) touchent tous
  les types : la consigne et l'exemple suivent le type du post-it (où il se colle, et une suite où il figure). Pour le
  pivot : « Pivot à décider », répondre aux questions de la section « Pivot » du panneau. Plusieurs avertissements :
  tous, l'un sous l'autre.
- **Résolu** : la pastille disparaît dès que le mur ne donne plus d'avertissement pour ce post-it (recalculé à chaque
  modification, glisser compris). Dessin seulement : rien n'est écrit, rien ne change dans draw.io ni dans l'export
  JSON (messages courts inchangés).
- **W1 révisé** : sur un mur dense, un post-it bien collé touche souvent aussi un voisin sans règle (System sous sa
  Command, à côté d'une Policy ; Constraint au-dessus de sa Command, à côté d'un Domain Event décalé). Un contact sans
  règle n'avertit plus que si l'un des deux post-it n'a aucun autre lien. Sur `eventstorming-commande.drawio`, les
  quatre W1 disparaissent (export JSON compris).
- **W2 révisé** : une Policy visée par un Hotspot (R4) n'a pas de W2 : sa suite est en suspens, la question est posée.
  Sur `eventstorming-commande.drawio`, « Quand le stock est réservé, demander le paiement » n'en a donc plus : le mur
  n'a plus aucun avertissement. Le message W2 propose aussi le Hotspot.
- **Mur des règles** `tests/fixtures/eventstorming-regles.drawio` : une ligne par règle (R1 à R5, W1 à W8, pivot), le
  cas bien placé (✓, sans pastille) à gauche, le ou les cas fautifs (✗) à droite ; titre de groupe = le cas. Un test
  vérifie les avertissements exacts de chaque cas.
- **Réglage de la page « Activer la validation »** (case du panneau de la page, sous « Labels »), coché par défaut :
  décoché (`spatial.es.validation=0` sur `<diagram>`, absent coché ; une étape d'annulation), plus aucune pastille
  « ! » ; la pastille « ? » du pivot reste (c'est une réponse, pas une règle du mur) ; l'export JSON garde ses
  avertissements.
- Tronc : `ModeParts.comment` reçoit aussi la page (le message dépend des voisins). Fin d'un glisser sur une page
  habillée par son mode (`dressing`) : le modèle est relu et la scène reconstruite (`LiveEdit.afterGeometryWrite`) ;
  avant, la scène du glisser était gardée et l'habillage des post-it restait celui d'avant le déplacement (titre de
  groupe emporté par le post-it glissé, défaut du sujet 514 ; pastilles des voisins non recalculées).
- **Fini quand :** sur `eventstorming-commande.drawio`, aucune pastille jaune ; sur `eventstorming-regles.drawio`,
  aucun cas ✓ n'a de pastille et chaque cas ✗ a les siennes ; leur survol montre le message et l'exemple adaptés au
  type ; un post-it posé seul en a une (W7) qui disparaît une fois collé ; un Domain Event à « Je ne sais pas » montre
  la pastille bleue et plus de « ? » à droite ; « Activer la validation » décoché retire les « ! » ; tests ;
  `make check` vert.
- Fait : pastilles `warnings/stickyBadge.ts` (triangle jaune « ! », disque bleu « ? » ; fonds au-dessus du papier),
  `warnings/stickyWarnings.ts` (avertissements par post-it en cache par page, habillage `spatial.es.badge`, partie
  `badge` pour le survol et le clic, réglage `VALIDATION_PROPERTY`), `warnings/warningHints.ts` (message court, place
  du type et exemple : `PLACES` pour W1, W7, W8) ; `stickyShape.ts` / `stickyLayout.ts` (pastille dessinée, label entre
  pastille et icône, `labelZone` borné à gauche) ; `pivot/pivotMark.ts` ne garde que le cube (glyphe « ? » déplacé
  dans la pastille), `pivot/pivot.ts` (`isPivot`, `isPivotUnknown`, `pivotQuestion`) ; `index.ts` (habillage fusionné
  titre + pastille, parties, réglage de page). Règles `export/wallRules.ts` : W1 seulement si l'un des deux post-it
  n'a aucun lien, pas de W2 pour une Policy visée par un Hotspot ; export JSON de `eventstorming-commande.drawio` :
  plus aucun avertissement (5 avant). Tronc : `ModeParts.comment(shape, part, page)` ; `LiveEdit.afterGeometryWrite`
  relit le modèle et reconstruit la scène sur une page habillée. Fixture `eventstorming-regles.drawio` (cas ✓ et ✗ par
  règle). Tests : `warnings/stickyWarnings.test.ts`, `warnings/wallCases.test.ts`, `export/json.test.ts`,
  `pivot/*.test.ts`, `core/domains/edit/drag/liveEdit.test.ts`, `rdd/editing/fieldParts.test.ts`. Docs : SPEC §14.5,
  `AJOUTER_UN_MODE.md`. Vérifié dans l'appli sur le serveur partagé : pastilles et messages au survol et au clic sur
  `eventstorming-commande.drawio` (copie locale antérieure du mur) et `eventstorming-regles.drawio` (aucune sur les
  cas ✓), « ? » bleu sur un pivot « Je ne sais pas », case « Activer la validation », titre de groupe qui ne suit plus
  le post-it glissé et pastilles recalculées au lâcher. Par les tests seulement : aucun avertissement sur la version du
  disque de `eventstorming-commande.drawio`.
