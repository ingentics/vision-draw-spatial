# Simplification de tracé commune et point d'entrée du tracé des arêtes

> Itération — moteur (tracé des flèches) ; dette technique

- `render/edges/route.ts` ne fait que réexporter le dossier `render/edges/route/` du même nom : il devient
  `route/index.ts` (les imports `…/render/edges/route` ne changent pas).
- `simplify` (rendu) et `simplifyPath` (`model/geometry.ts`, tracés calculés) restent deux fonctions, mais reposent
  sur une même fonction de nettoyage. Seul écart : `simplify` garde un demi-tour (un point intermédiaire posé par
  l'utilisateur peut faire repartir le trait en arrière, draw.io le dessine) ; `simplifyPath` le retire (un pic
  dans un tracé calculé n'a pas de sens).
- Tests du demi-tour pour les deux variantes (le test de `simplify` qui dit garder les demi-tours n'en contient pas).
- **Fini quand :** une seule implémentation, comportement des deux fonctions inchangé (tests), `make check` vert.
- Fait : `render/edges/route.ts` déplacé en `render/edges/route/index.ts`. `prunePath(path, epsilon, keepBacktracks)`
  dans `model/geometry.ts` porte le nettoyage ; `simplifyPath` (`keepBacktracks` faux) et `simplify`
  (`render/edges/route/simplify.ts`, `keepBacktracks` vrai) s'y appuient. Les deux variantes sont justes pour leur
  usage : le rendu doit dessiner l'aller-retour que draw.io dessine, un tracé calculé ne doit pas garder de pic (seul
  cas possible : arrivée au bout en s'éloignant de la forme, le point retiré laisse le dernier segment
  perpendiculaire). Équivalence vérifiée sur 50 000 tracés aléatoires (demi-tours, obliques, pas nuls) contre les
  deux anciennes implémentations (test jetable, retiré) ; tests du demi-tour ajoutés aux deux. `make check` vert,
  appli rechargée sans erreur. Après le déplacement de `route.ts`, le serveur Vite gardait l'ancien chemin en cache :
  il a fallu toucher les fichiers qui l'importent.
