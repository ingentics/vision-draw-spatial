# Pivot du Domain Event : quatre réponses et icônes

> Itération — mode Event storming, reprise de 515

- **Réponses** du réglage « Pivot » : Oui, Non, Je ne sais pas, Non défini (dans cet ordre) ; **Non défini par
  défaut**. Enregistré sur le post-it : `spatial.es.pivot=1` (Oui), `0` (Non), `unknown` (Je ne sais pas), absent
  (Non défini). Un fichier qui portait `0` reste à Non ; un Domain Event sans attribut, jusqu'ici Oui, passe à Non
  défini.
- **Question** renommée : « Qui réagit à cet événement ? Est-ce le même domaine métier que celui qui l’a produit ? ».
- Les boutons prennent toute la largeur du panneau, à parts égales (choix `buttons` du schéma commun).
- **Icônes** en haut à droite du post-it, 20 × 20 à 7 des bords haut et droit, trait noir de 1, discrètes :
  - Oui : un cube entouré de huit flèches (il se diffuse) ;
  - Je ne sais pas : un triangle d'alerte avec un point d'exclamation ;
  - rien pour Non et Non défini.
  Le label du type s'arrête avant l'icône (réduit s'il ne tient plus). Dessin seulement : rien n'est écrit, rien ne
  change dans draw.io.
- **Fini quand :** un Domain Event neuf est à Non défini, sans icône ; Oui montre le cube, Je ne sais pas l'alerte,
  en haut à droite sans chevaucher le label ; Non et Non défini n'en ont pas ; les quatre boutons remplissent la
  largeur du panneau ; les autres post-it n'ont ni réglage ni icône ; tests ; `make check` vert.
- Fait : `pivot/pivot.ts` (quatre réponses, `pivotMarkOf`), `pivot/pivotMark.ts` (cube et flèches, alerte ; carré de
  20 à 7 des bords), `shapes/common/stickyShape.ts` et `stickyLayout.ts` (icône dessinée, `labelZone` borné à
  droite avant elle) ; panneau : boutons écrits à parts égales sur toute la largeur (`wide-choice`, `DeclaredField.tsx`,
  `main.css`). Vérifié dans l'appli sur `eventstorming-commande.drawio` : Non défini par défaut sans icône, cube pour
  Oui, alerte pour Je ne sais pas, label non chevauché, ⌘Z. Tests : `pivot/pivot.test.ts`, `pivot/pivotMark.test.ts`.
