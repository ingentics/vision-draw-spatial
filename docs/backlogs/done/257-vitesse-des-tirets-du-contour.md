# Vitesse des tirets du contour de sélection : 4 px/s par défaut

> Itération — paramètres (sélection)

- Le paramètre « Vitesse des tirets » (`selection.speed`) vaut **4 px/s** par défaut (au lieu de 12) ; bornes
  inchangées (2 à 80). Les paramètres étant enregistrés en entier, un 12 enregistré (l'ancien défaut) passe à 4 par
  une migration ; toute autre valeur réglée est gardée.
- **Fini quand :** sans réglage enregistré, le contour d'une sélection défile à 4 px/s et le paramètre affiche
  « 4 px/s » ; « Réinitialiser » y revient ; `make check` vert.
- Fait : défaut `selection.speed` à 4 (`settings/schema/view.ts`) ; paramètres enregistrés en version 4
  (`app/settingsStore.ts`) : un 12 enregistré (`LEGACY_SELECTION_SPEED`) passe à 4 à la lecture. Tests
  `settings.test.ts` (défauts) et `settingsStore.test.ts` (migration : 12 → 4, autre valeur gardée, version 4
  intacte). SPEC §11 et §13. Vérifié dans l'appli : paramètres enregistrés avec 12 (version 3) → « Vitesse des
  tirets » affiche 4 px/s.
