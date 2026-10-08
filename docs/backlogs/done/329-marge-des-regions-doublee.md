# Marge des régions RDD doublée

> Itération — mode RDD, régions (reprise de 183 et 184)

- La marge d'une région autour de son contenu (`REGION.margin`) passe de 20 à 40 px : agrandissement quand une forme
  dépasse (sujet 183) et ajustement « f » (sujet 184).
- **Fini quand :** dans l'appli, une table posée en dépassant d'une région l'agrandit avec 40 px de marge, et « f »
  ramène la région à 40 px autour de son contenu.
- Fait : `REGION.margin` à 40 dans `regions/regionLayout.ts` (agrandissement et « f ») ; tests des régions mis à jour
  (trois positions décalées pour garder ce qu'ils vérifient avec la marge plus grande). `make check` OK.
