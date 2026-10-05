# Suivre un lien à Espace + clic

> Itération — interaction (navigation et liens) ; reprise de 09

- Nouvelle touche « Espace » pour suivre un lien, et touche par défaut (au lieu de ⌘) : maintenue, elle fait
  ressortir les zones liées (« Mode navigation ») comme ⌘ jusqu'ici, et le glisser déplace toujours la vue.
- Espace + clic sans glisser sur une forme liée plonge dans le lien ; sur une forme sans lien, rien (pas de
  sélection) ; un glisser reste un déplacement de la vue.
- Paramètres enregistrés : la touche ⌘ (ancien défaut) passe à Espace (migration version 3) ; ⌘, Ctrl, Maj, Alt et
  « aucune » restent au choix.
- **Fini quand :** Espace maintenu = zones liées en évidence et main de déplacement ; Espace + clic sur une zone liée
  = plongée, Espace + glisser = déplacement ; `make check` vert.
- Fait : touche `space` ajoutée aux touches pour suivre un lien et mise par défaut (`interaction/selection.ts`,
  `interaction/controls.ts`) : maintenue, elle allume les zones liées et garde la main de déplacement ; un clic sans
  glisser suit le lien (le glisser reste un pan), et sur une forme sans lien ne sélectionne rien (`Engine.handleClick`).
  Infobulle « Espace + clic », choix « Espace » dans les paramètres, migration des paramètres enregistrés en version 3
  (⌘ → Espace, `app/settingsStore.ts`). Tests : `selection.test.ts`, `tests/app/settingsStore.test.ts`. Vérifié dans
  l'appli sur `fixtures/links.drawio` : Espace maintenue = « Mode navigation », Espace + clic sur « Voir le détail »
  ouvre la page Détail.
