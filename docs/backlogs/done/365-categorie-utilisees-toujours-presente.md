# Catégorie « Utilisées » toujours présente, repliée par défaut

> Itération — palette de formes (barre gauche)

- La catégorie « Utilisées » de la palette n'apparaît plus en différé (ex. à la fin d'une plongée depuis la vue
  graphe, ou quand la première forme est posée) : elle est toujours en tête de la palette, même vide, et ne décale
  plus les catégories du dessous.
- **Repliée par défaut** ; l'état choisi (dépliée ou repliée) est retenu d'une session à l'autre, comme les autres
  catégories. Dépliée et vide : une ligne « Aucune forme sur la page ».
- Pendant une recherche, inchangé : elle n'apparaît que si des formes de la page correspondent.
- **Fini quand :** dans l'appli, la palette montre « Utilisées » repliée à l'ouverture d'un fichier, sur une page
  vide comme sur une page avec des formes ; la déplier montre les formes de la page ou « Aucune forme sur la page ».
- Fait : `src/app/Palette.tsx` garde « Utilisées » hors recherche même vide, avec « Aucune forme sur la page » quand
  elle est dépliée et vide. Repliée par défaut : la liste des catégories repliées retient `used-open` quand elle est
  dépliée (une ancienne entrée `used` ne compte plus : qui l'avait repliée la retrouve repliée, qui l'avait dépliée la
  retrouve repliée une fois). `src/app/Viewer.tsx` : la palette (formes utilisées, contenu, désactivation) suit la
  page des barres latérales, celle d'arrivée dès le début d'une plongée depuis la vue graphe : c'est ce qui la faisait
  apparaître en différé. Vérifié dans l'appli (`fixtures/parent-pages.drawio`) : « Utilisées » repliée à l'ouverture,
  dépliée elle montre la forme de la page ; pendant une plongée, elle porte les formes de la page d'arrivée dès la
  première image. Cas vide (« Aucune forme sur la page ») vérifié seulement par la lecture du code.
