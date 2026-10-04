# Paramètres dans une fenêtre modale, façon IntelliJ

> Itération — paramètres (panneau §13)

- Le bouton « Paramètres » de la barre d'outils ouvre une **fenêtre modale** au-dessus de l'appli (fond assombri,
  plan inaccessible), à la place du panneau dans la barre de droite (qui garde panneau contextuel et Diagnostics).
- En-tête : titre « Paramètres », « Réinitialiser » et une croix de fermeture ; **Échap** ferme aussi (Échap vide
  d'abord la recherche si elle n'est pas vide, et annule d'abord la saisie d'un raccourci en cours).
- À gauche, **l'arbre des catégories** : les sections, dépliables (chevron) sur leurs sous-sections ; la recherche
  globale au-dessus de l'arbre.
- À droite, le nœud choisi : une section affiche toutes ses sous-sections, une sous-section seulement la sienne, sous
  un fil d'Ariane « Section › Sous-section ». Le dernier nœud choisi est repris à la réouverture.
- Avec une recherche : à droite tous les résultats, toutes sections confondues (comme avant) ; l'arbre ne garde que
  les nœuds qui correspondent, et un clic sur l'un d'eux fait défiler jusqu'à lui.
- **Fini quand :** la modale s'ouvre depuis la barre d'outils, se ferme par la croix et par Échap ; cliquer un nœud
  de l'arbre affiche ses réglages à droite ; la recherche filtre arbre et réglages ; `make check` vert.
- Fait : `SettingsPanel.tsx` devient une `<dialog>` modale (`showModal` : fond assombri, plan inerte, focus sur la
  recherche) ; l'arbre est lu sur les titres affichés des sections et sous-sections (rien à maintenir à la main),
  le nœud choisi est affiché en masquant les autres (`showNode`), la recherche garde `filterSections`. Les touches
  tapées dans la modale ne remontent pas jusqu'à la vue. `Viewer.tsx` : la modale sort de la barre de droite
  (état `settingsOpen`) ; `main.css` : styles `.settings-dialog`, `.settings-tree` ; SPEC §13 et barres latérales
  mises à jour. Vérifié dans l'appli : ouverture, choix d'une section puis d'une sous-section (fil d'Ariane),
  recherche « couleur » (arbre et réglages filtrés), Échap qui vide la recherche puis ferme, croix, nœud repris à la
  réouverture.
