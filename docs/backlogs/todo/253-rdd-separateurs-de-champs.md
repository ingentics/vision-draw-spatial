# RDD : séparateurs entre les champs

> Milestone — mode RDD (comportements des modèles) ; dépend de 249, 250

- Un **séparateur** est une ligne de la liste : `{"divider":true,"label":"…"}` ; dessiné comme un trait horizontal
  sur la largeur de la table, avec son label éventuel **au milieu, 7 pt, gris** (`#999999`), le trait interrompu
  autour du texte.
- Ajout : champ sélectionné, la touche **« - »** insère un séparateur après lui (jamais avant la clé primaire) ; son
  label passe en édition (choix de l'utilisateur, le « + » n'a plus de menu depuis 256).
- Double-clic sur un séparateur : édition du label sur place ; **valider un label vide supprime le séparateur**.
- Sélection, suppression et glisser comme un champ (249, 251, 252).
- **Fini quand :** un séparateur ajouté entre deux champs se dessine, prend un label gris centré, disparaît quand on
  vide son label ; ⌘Z à chaque étape ; `make check` vert.
