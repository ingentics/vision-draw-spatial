# Aligner et Répartir suivent le mode de la page

> Itération — édition (arrangement de la sélection) ; reprise de 182, 183, 241. Plus simple après 288.

- Constat (lecture du code, à confirmer à l'œil d'abord) : `ArrangeCommands.arrangeSelection`
  (`core/edit/commands/arrange.ts`) déplace les formes sans consulter le mode de la page. Conséquences :
  - une région RDD alignée part sans ses tables (`carries`) ;
  - elle peut passer sur une région sœur (`obstacles`) ;
  - une table sortie de sa région n'agrandit pas cette dernière (`placed`).
- Correction : Aligner et Répartir déplacent aussi les formes emportées. Le décalage des formes qui ont des obstacles
  est borné comme au clavier (`clampMove`, un axe puis l'autre). Le mode remet en ordre (`placed`, avec la page
  d'avant) dans la même étape d'annulation.
- Une forme dont le décalage est réduit à zéro par un obstacle ne bouge pas : les autres s'alignent quand même.
- **Fini quand :**
  - sur une page RDD, aligner à gauche une région et une table emporte le contenu de la région ;
  - deux régions sœurs alignées s'arrêtent à l'écart réglé ;
  - une table alignée hors de sa région l'agrandit ;
  - une seule annulation défait le tout ;
  - test sur chacun des trois cas ; `make check` vert.
