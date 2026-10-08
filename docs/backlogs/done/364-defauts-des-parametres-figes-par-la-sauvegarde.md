# Paramètres : un défaut modifié n'atteint pas qui a déjà enregistré ses réglages

> Dette — paramètres de l'appli de démo (SPEC §13)

- Constat : `settingsStore.saveSettings` enregistre l'objet de paramètres entier ; toutes les valeurs par défaut sont
  figées au premier enregistrement, et un défaut changé ensuite (ex. raccourci vue graphe sans touche, sujet 365 ;
  écarts de la vue graphe, sujet 368) ne s'applique pas à ces utilisateurs.
- **N'enregistrer que les écarts aux défauts** (`settingsDiff`, même clé `drawio-spatial:settings`) : à la lecture,
  ces écarts sont fusionnés sur les défauts du moment, comme aujourd'hui. « Réinitialiser » n'enregistre donc plus
  rien.
- Les réglages déjà enregistrés en entier sont relus tels quels : impossible d'y distinguer un choix d'un défaut figé.
  Au prochain enregistrement, seules les valeurs différentes des défauts actuels restent ; un « Réinitialiser » les
  ramène toutes aux défauts.
- **Fini quand :** test : un réglage modifié puis enregistré ne contient que ce réglage, et relu sur des défauts
  changés il garde le réglage modifié et prend les nouveaux défauts pour le reste ; dans l'appli, après
  « Réinitialiser », le stockage ne contient plus que `{}` et les défauts du sujet 368 s'affichent.
- Fait : `src/app/settingsStore.ts` : `saveSettings` enregistre `settingsDiff(settings, DEFAULT_SETTINGS)` (écarts
  feuille à feuille, sections imbriquées comprises ; une valeur égale au défaut est omise), lecture inchangée (fusion
  sur les défauts du moment). Tests `tests/app/settingsStore.test.ts` (défauts seuls → `{}`, un réglage modifié → ce
  seul réglage, relecture sur des défauts changés). SPEC §13. Vu dans l'appli : après un enregistrement, le stockage
  ne contient plus que les écarts (`selection.animated` et les quatre valeurs de la vue graphe figées par l'ancienne
  sauvegarde, retirées ensuite à la main dans le navigateur de l'appli à la demande de l'utilisateur).
