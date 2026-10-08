# Paramètres : un défaut modifié n'atteint pas qui a déjà enregistré ses réglages

- `settingsStore.saveSettings` enregistre l'objet de paramètres entier : toutes les valeurs par défaut sont figées au
  premier enregistrement, et un défaut changé ensuite (ex. raccourci vue graphe sans touche, sujet 365) ne s'applique
  pas à ces utilisateurs. Piste : n'enregistrer que les écarts aux défauts.
