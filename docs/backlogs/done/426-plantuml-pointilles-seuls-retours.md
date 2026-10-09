# PlantUML : dans un flux à pointillés, seules les flèches en pointillés sont des retours

> Itération — export PlantUML des flux ; reprise de 266

- Un rappel (B → A pendant un aller A → B ouvert) ne se distingue pas d'un retour sur le dessin : le flux 1. Acteur → B,
  2. B → XX, 3. XX → B, 4. B → XX, 5. XX → B, 6. B → Acteur se lit aussi bien « 3 retour de 2, 4 nouvel aller » que
  « 3 rappel, 4 son retour, 5 retour de 2 ».
- Règle par flux : si au moins une flèche du flux est en pointillés, ses flèches pleines sont toujours des allers et
  seules ses flèches en pointillés ferment un aller ouvert. Un flux tout en flèches pleines garde la lecture du
  sujet 266 (une flèche pleine qui ferme un aller ouvert est son retour).
- Section « Séquences » du panneau d'une flèche d'un flux : choix « Sens » en deux boutons à icône, Aller (trait
  plein) / Retour (pointillés). Le style draw.io est la source de vérité : Retour écrit `dashed=1`, Aller retire
  `dashed` ; le choix affiché est lu dans le style. Masqué pour une flèche hors flux.
- **Fini quand :** le choix « Sens » d'une flèche passe son trait en pointillés et l'en sort ; le flux ci-dessus avec 4, 5 et 6 en pointillés donne `P1 -> P2 ++`, `P2 -> P3 ++`, `P3 -> P2 ++`,
  `P2 --> P3 --`, `P3 --> P2 --`, `P2 --> P1 --` ; tout en pleines, il donne toujours la sortie actuelle ; `make check`
  vert.
- Fait : `engine/modes/sequences/export/plantuml.ts` — un flux qui a au moins une flèche en pointillés
  (`dashedReturns`) ne ferme un aller que par une flèche en pointillés ; ses flèches pleines y sont des allers.
  `engine/modes/sequences/index.ts` — réglage « Sens » de la flèche (choix à icônes Aller / Retour), lu et écrit dans
  la clé `dashed` du style, masqué hors flux ; l'icône Aller est tout en `accent` (le trait `line` des icônes de mode
  est toujours en pointillés). Écart : sur un flux qui a des pointillés, une flèche pleine qui fermait un aller ouvert
  (sujet 266) devient un rappel. Tests `sequencesExport.test.ts` (flux de l'exemple avec et sans pointillés) et
  `sequences.test.ts` (réglage « Sens »). Vérifié dans l'appli (fixture `sequences.drawio`) : le choix passe la
  flèche en pointillés et l'en sort ; l'export PlantUML vérifié par les tests seulement.
