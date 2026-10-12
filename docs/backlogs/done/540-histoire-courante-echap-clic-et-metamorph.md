# Story telling : aucune histoire courante, clic sur une ligne, sans barre de lancement, Metamorph

> Itération — mode Story telling (reprise de 474 et 534)

- **Échap** sans rien de sélectionné : plus aucune histoire courante (rien n'est estompé, flèches partagées dans la
  couleur de la plus petite histoire). Avec une sélection, Échap la retire d'abord (inchangé). Brique du tronc :
  `ModeCurrent.clearable` (courant effaçable par Échap) ; Tab repart de l'histoire 1, un clic sur une flèche en
  rechoisit une.
- **Clic sur le fond** : plus de sélection et plus d'histoire courante, d'un coup.
- **Flèche tirée** depuis une forme sans histoire courante : elle ouvre une nouvelle histoire (à la fin, première
  couleur libre) ; l'histoire courante reste « aucune », pour tracer la suite.
- **Clic sur une ligne** de la section « Histoires » : l'histoire devient la courante (pas pendant la simulation).
- **Barre flottante** : hors simulation, plus de bouton « ▶ Lancer la simulation » sur la zone de dessin (il reste
  dans la section « Histoires ») ; la barre n'apparaît que pendant la simulation.
- **Palette** du mode : Metamorph en plus (acteur, acteur droïde, rectangle, Metamorph).
- **Fini quand :** sur `tests/fixtures/storytelling.drawio`, Échap (rien de sélectionné) ou un clic sur le fond enlève l'estompage ; une flèche tirée alors ouvre l'histoire 4 ; clic sur
  la ligne « 2 » rend l'histoire 2 courante ; pas de bouton flottant hors simulation ; Metamorph dans la palette ;
  `make check` vert.
- Fait : brique du tronc `ModeCurrent.clearable` (`core/modes/types.ts`) : `ModeCurrents.clearModeCurrent()` (courant
  effacé noté `null`, `initial` ne le remet pas), appelé par Échap sans sélection (`cameraControls.ts`) et par un clic
  sur le fond (`pointerInput.ts`) ; décrit dans `AJOUTER_UN_MODE.md`. Story telling : `clearable`, `edges.created`
  (sans courant, `startStory`), Metamorph dans la palette. Appli : clic sur une ligne (`takeover.setModeCurrent`,
  pas pendant la simulation ; ↑ ↓ × ne la choisissent pas), `StoryBar` vide hors simulation, survol de la ligne
  (`main.css`). Tests `modeCurrents.test.ts` (courant effaçable) et `storytelling.test.ts` (flèche tirée, palette).
  Vu dans l'appli sur `storytelling.drawio` : palette, plus de bouton flottant, clic sur la ligne 2, Échap, clic sur
  le fond ; flèche tirée qui ouvre une histoire seulement par les tests.
