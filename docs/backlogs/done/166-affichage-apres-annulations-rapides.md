# Affichage à jour après des annulations rapides

> Itération — édition (annuler / rétablir) ; constaté pendant la vérification de 164

- Après plusieurs flèches du clavier puis une rafale d'annulations (⌘ Z répété), les textes des formes disparaissent
  et une forme peut rester dessinée à sa position déplacée, alors que le document est bien revenu à son état
  (un changement de vue redessine correctement).
- Chaque annulation / rétablissement doit laisser la scène conforme au document : formes à leur place, textes
  affichés, quelle que soit la cadence des appuis.
- **Fini quand :** sélection d'une forme, 5 flèches, 6 × ⌘ Z rapides puis 6 × ⌘ ⇧ Z : la scène suit le document à
  chaque étape, textes compris ; test de non-régression ; `make check` vert.
- Fait : pas de défaut dans l'appli, rien à corriger dans le code. Après chaque annulation, le document, l'arbre XML,
  la pile d'annulation et la scène Three.js sont justes (formes à leur place, textes présents) ; seul l'écran était
  en retard. En cause : le panneau navigateur de vérification était masqué, et `requestAnimationFrame` y tourne à
  ≈ 1 image/s (mesuré : 2 à 3 images/s, image demandée partie 1 s plus tard) ; les captures montraient donc une
  image antérieure (forme pas encore redessinée, textes pas encore affichés après leur préparation asynchrone).
  Avec une cadence normale (`requestAnimationFrame` remplacé par une minuterie de 16 ms), la séquence du critère
  (glisser, 5 flèches, 6 × ⌘ Z, rétablir, annuler) dessine chaque étape, la dernière image conforme au document.
