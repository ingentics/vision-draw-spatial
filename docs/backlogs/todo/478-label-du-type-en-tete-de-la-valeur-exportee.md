# Export draw.io : label du type en tête de la valeur des post-it Event storming

> Moteur — écriture du fichier ; demandé par le mode Event storming (475)

- Aujourd'hui le fichier ne porte que le texte du ticket : dans draw.io, un post-it est un rectangle coloré à ombre,
  sans le nom de son type.
- Donner au mode un moyen d'écrire la valeur exportée (ou la valeur elle-même) : label en gras en tête (`<b>Command</b>
  <br>Payer`), le texte dessous ; rien en tête quand « Labels » est décoché. L'édition en place ne montre que le texte.
- **Fini quand :** `eventstorming.drawio` enregistré puis ouvert dans draw.io montre le type en gras en tête de chaque
  post-it ; rouvert dans l'appli, rien ne change ; `make check` vert.
