# Faire défiler la liste des fichiers du lanceur

> Itération — lanceur

- Le lanceur ne défile plus : `.launcher` a `min-height: 100%` et grandit avec la liste, alors que la page
  (`html, body` en `overflow: hidden`, `#root` fixé) ne défile plus. Le lanceur prend la hauteur exacte de la
  fenêtre (`height: 100%`) et défile lui-même (`overflow-y: auto`, déjà présent).
- **Fini quand :** avec plus de fichiers récents que la fenêtre n'en montre, la molette fait défiler le lanceur
  jusqu'aux exemples ; `make check` vert.
- Fait : `src/app/main.css` — `.launcher` passe de `min-height: 100%` à `height: 100%` (il devient le conteneur qui
  défile) et aligne la carte en haut (`align-items: flex-start`) pour garder la marge du bas. Vérifié dans
  l'appli en fenêtre de 400 px de haut : le lanceur défile jusqu'au dernier exemple.
