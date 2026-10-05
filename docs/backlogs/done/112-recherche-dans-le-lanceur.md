# Recherche dans le lanceur

> Itération — lanceur (récents et exemples)

- Un champ de recherche au-dessus des listes « Récents » et « Exemples » filtre les deux listes au fil de la frappe
  (nom du fichier, sans tenir compte de la casse ni des accents). Échap vide le champ.
- Une liste sans résultat l'indique ; une section d'exemples vide est masquée.
- **Fini quand :** taper un bout de nom dans le lanceur n'affiche que les fichiers qui le contiennent ; `make check` vert.
- Fait : champ de recherche dans `src/react/Launcher.tsx` (affiché s'il y a des récents ou des exemples), qui
  filtre récents et exemples par nom (casse, accents et apostrophes ignorés), Échap le vide ; message « Aucun
  fichier récent ne correspond », section Exemples masquée sans résultat. Style `.launcher-search` dans
  `src/app/main.css`. Vérifié dans l'appli : « ar » ne laisse que `fixtures/parents.drawio`.
