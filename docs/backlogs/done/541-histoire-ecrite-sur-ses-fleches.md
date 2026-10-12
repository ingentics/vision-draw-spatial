# Story telling : l'histoire écrite sur ses flèches, plus de flèche partagée

> Itération — mode Story telling (reprise de 474 et 540)

La suite d'une histoire n'est plus calculée depuis les formes atteintes : chaque flèche dit à quelle histoire elle
appartient. Une flèche est dans une seule histoire ; pour continuer une histoire depuis une forme où passe une autre,
on trace une nouvelle flèche.

- **Attribut** `spatial.story.of` sur une flèche sans numéro : id de la flèche numérotée qui ouvre son histoire. Une
  flèche numérotée est dans sa propre histoire (son `of` éventuel est ignoré, effacé quand elle prend un numéro).
- **Flèche tirée** depuis une forme : histoire courante → elle la continue (`of` écrit) ; aucune → elle ouvre une
  nouvelle histoire (inchangé, sujet 540).
- **Ordre des flèches** d'une histoire : depuis la forme d'arrivée de la flèche numérotée, la flèche de l'histoire qui
  en part, et ainsi de suite (boucle : arrêt). Plusieurs flèches de l'histoire partent d'une forme : la première dans
  l'ordre de dessin est suivie, signalé dans les Diagnostics. Flèches de l'histoire non atteintes par ce fil : mises
  à la fin (ordre de dessin), signalées.
- **Panneau d'une flèche sans numéro** : choix « Histoire » (Aucune, ou « N. titre » avec sa pastille de couleur) à la
  place de la note « Dans l'histoire / Dans les histoires ». Masqué sur une flèche numérotée.
- **Retrait du numéro** (×, décocher « Début d'histoire ») : les flèches de cette histoire n'ont plus d'histoire (`of`
  effacé, même étape d'annulation). **Flèche numérotée supprimée** : `of` des siennes effacé (comme la remise en ordre
  des numéros). `of` qui ne désigne aucune histoire : ignoré, signalé.
- **Copier-coller** : la copie perd aussi `of`.
- **Titre de l'histoire** : textes de ses étapes à la suite — forme de départ, puis chaque flèche et sa forme
  d'arrivée —, chacun sur une ligne et rogné, séparés par une espace, les vides omis ; sans aucun texte :
  « Histoire N » (ex. « Client Passer commande Panier Payer Paiement Expédier Livraison »). Dans la liste, titre coupé,
  entier dans la bulle (la grille des listes du panneau, Séquences comprises, ne déborde plus). Les Diagnostics nomment l'histoire par son numéro (« Histoire 2 : … »).
- **Habillage** : une flèche a la couleur de sa seule histoire (plus de règle de flèche partagée).
- Fichiers existants : les flèches de suite sans `of` ne sont plus dans aucune histoire ; on les y remet par le
  choix « Histoire » ou en les retraçant.
- Fixture `tests/fixtures/storytelling.drawio` : `of` sur Payer, Expédier (histoire 1), Valider (histoire 2),
  Vérifier, Corriger (histoire 3). L'histoire 2 s'arrête à Paiement.
- **Fini quand :** sur la fixture, la liste montre « Client Passer commande Panier… » ; Expédier n'est que dans l'histoire 1 (vert absent) ; Paiement sélectionné, tracer
  une flèche vers Livraison avec l'histoire 2 courante la met dans l'histoire 2 ; le panneau d'une flèche montre le
  choix « Histoire » ; SPEC à jour ; tests (ordre, branche, flèche hors du fil, `of` orphelin, retrait du numéro,
  flèche tirée) ; `make check` vert.
- Fait : `stories.ts` : clé `OF`, histoires faites de leurs flèches `of` (fil depuis la forme d'arrivée, branches et
  flèches hors du fil signalées, `of` orphelin ignoré et signalé), `byEdge` à une seule histoire, titre `storyTitle`,
  `setStoryOf`, `startStory` / `stopStory` / `repairStories` effacent les `of` concernés ; Diagnostics nommés par
  numéro. `index.ts` : choix « Histoire » à la place de la note, `edges.created` (continue l'histoire courante),
  couleur sans règle de partage (`current.redraws` retiré), `pasteKeys` avec `OF`. Appli : titre coupé avec bulle,
  `.flow-list` bornée (`grid-template-columns: minmax(0, 1fr)`, Séquences comprises). Fixture mise à jour, SPEC
  (dont le report du sujet 540) et SUMMARY. Tests `storytelling.test.ts` (fil, branche, hors du fil, orphelin, titre,
  choix, retrait, suppression, flèche tirée) et `storyPlayback.test.ts`. Vu dans l'appli : Expédier dans l'histoire 1
  seule, histoire 2 à 2 flèches, choix « Histoire » sur Valider, titres coupés ; flèche tirée qui continue l'histoire
  seulement par les tests. Pas de migration : les flèches de suite des fichiers existants sont hors histoire.
