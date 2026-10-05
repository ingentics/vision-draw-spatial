# Aligner et répartir la sélection

> Interaction (sélection multiple) — panneau contextuel ; comme la section « Arrange › Align / Distribute » de draw.io

- Avec **au moins 2 formes sélectionnées**, une zone « Aligner » apparaît dans le panneau contextuel ; la partie
  « Répartir » n'est active qu'à partir de **3 formes** (avec 2, elle est grisée). Les flèches de la sélection ne
  bougent pas elles-mêmes, elles suivent leurs formes.
- **Référence** (« Par rapport à »), comme draw.io : la sélection (sa boîte englobante), le premier ou le dernier
  élément sélectionné (« Dernier sélectionné » par défaut, comme dans la capture) ; la référence ne bouge pas.
- **Aligner, horizontalement** (5 boutons) : placer à gauche de la référence (bord droit contre son bord gauche),
  aligner les bords gauches, centrer, aligner les bords droits, placer à droite de la référence (bord gauche contre
  son bord droit).
- **Aligner, verticalement** (5 boutons) : placer au-dessus, aligner les hauts, centrer au milieu, aligner les bas,
  placer en dessous.
- **Répartir, horizontalement** (4 boutons) : bords gauches, centres, bords droits à intervalles égaux ; espacement
  égal entre les formes.
- **Répartir, verticalement** (4 boutons) : hauts, milieux, bas à intervalles égaux ; espacement égal.
- **Écartés** (en rouge sur la capture) : le 6ᵉ bouton de chaque ligne d'alignement et le 5ᵉ de chaque ligne de
  répartition de draw.io.
- Positions écrites dans la géométrie (`mxGeometry` x / y, repère du parent), une étape d'annulation par clic
  (« Aligner » / « Répartir ») ; en ancrage automatique, recalcul des flèches touchées dans la même étape.
- **Fini quand :** avec 2 formes sélectionnées la zone d'alignement apparaît et chaque bouton les place comme
  draw.io (référence respectée) ; avec 3 formes ou plus la répartition fonctionne ; une seule forme = pas de zone ;
  le fichier rouvert dans draw.io montre les mêmes positions ; `make check` vert.
- Fait : calcul pur `src/engine/edit/align.ts` (`alignDeltas`, `distributeDeltas`, tests `tests/engine/edit/align.test.ts`) ;
  `engine.alignSelection(move, reference)` / `engine.distributeSelection(move)` déplacent la forme qui bouge vraiment
  (groupe), sans double déplacement d'une forme contenue dans une autre, les verrouillées servant de référence sans
  bouger ; `moveCell` dans l'arbre XML, une étape d'annulation, répartition des flèches par `documentChanged`.
  Section `src/app/ArrangeSection.tsx` dans le panneau de sélection multiple (icônes SVG, trait d'alignement en
  accent), référence en réglage `edit.alignReference` (défaut « Dernier sélectionné ») ; SPEC §11.1 et paramètres.
  Vérifié dans l'appli (`fixtures/sequences.drawio`) : aligner à gauche sur le dernier, répartir les hauts, placer à
  droite donnent les positions attendues, sélection gardée, trois annulations ramènent l'état de départ ; 2 formes =
  répartition grisée, 1 forme = pas de section. Pas encore rouvert dans draw.io (positions écrites en x / y simples).
