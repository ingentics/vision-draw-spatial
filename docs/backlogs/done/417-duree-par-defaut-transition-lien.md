# Durée par défaut de l'animation d'un lien entre pages : 0,5 s

> Itération — paramètres, « Liens entre pages › Transitions » (`transition.durationMs`)

- Valeur par défaut de « Durée » (animation du passage par un lien) : 500 ms au lieu de 1000 ms. Bornes inchangées
  (0 à 5000, pas de 50). Des paramètres déjà enregistrés gardent leur valeur.
- **Fini quand :** sans paramètre enregistré (ou après « Réinitialiser »), la durée affichée est « 0.50 s ».
- Fait : `transition.durationMs` à 500 par défaut (`core/settings/schema/navigation.ts`) ; SPEC. Vérifié dans
  l'appli : « Durée » affiche 0.50 s sans paramètre enregistré.
