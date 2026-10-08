# Bouts répartis qui tombent sur une arrivée placée par le mode

> Dette vue au sujet 338 — `core/edit/anchoring/auto/distribute.ts` (`distributeAnchors`, option `kept`)

- **Constat** : en ancrage automatique et Typon, les arrivées que le mode place lui-même (`edges.placedEntries`, ex.
  flèche document → champ dynamique RDD, sur la ligne du champ) sont sorties de la répartition : ni déplacées, ni
  comptées. Les autres bouts du même côté de la forme sont répartis à (k + 1) / (n + 1) comme si elles n'existaient
  pas.
- **Effet** : un bout réparti peut tomber au même point, ou tout près, qu'une arrivée placée par le mode. Ex. table
  RDD de trois lignes : une flèche document arrive sur la ligne du milieu (côté gauche, `entryY` ≈ 0,5), une relation
  ordinaire arrive seule sur ce même côté → placée à 1/2, exactement au même point ; les deux flèches se superposent
  sur leur dernier segment (le tracé les écarte ensuite, mais les bouts sont confondus).
- **Piste** : dans `distributeAnchors`, garder les bouts de `kept` comme points fixes de leur côté et répartir les
  autres dans les intervalles libres (comme les points libres entre ancres du mode manuel, SPEC §8.3), ou décaler
  le slot qui tombe à moins de l'écart entre flèches (`shapes.edgeSpacing`) d'un point gardé. L'ordre le long du côté
  doit rester celui des formes à l'autre bout, pour ne pas créer de croisement.
- **Fini quand :** test de `distributeAnchors` avec un bout de `kept` au milieu d'un côté et un bout réparti sur ce
  côté : ils ne sont pas confondus ; à l'œil sur une page RDD en automatique, une relation et une flèche de document
  arrivant du même côté d'une table ne partagent pas leur point d'arrivée.
- Fait : `distributeAnchors` (`core/edit/anchoring/auto/distribute.ts`) garde les bouts de `kept` comme points fixes
  de leur côté ; `freeSlots` répartit les autres sur la grille (j + 1) / (m + 1) de tous les bouts du côté (m = répartis
  + gardés), après en avoir retiré le point le plus proche de chaque bout gardé : l'ordre le long du côté est conservé,
  et sans bout gardé rien ne change. Comportement modifié : un bout réparti n'est plus placé comme si les bouts du
  mode n'existaient pas. Test dans `distribute.test.ts` (bout gardé à 0,5 + un bout réparti → 0,3333) ; le test du 338
  ne vérifie plus que le bout gardé n'est pas déplacé. `make check` OK. Pas vérifié à l'œil sur une page RDD.
