# Appli : couleurs de la simulation recopiées dans le CSS

> Dette vue à l'audit 464 (reprise de 462, 463)

- `main.css` recopie le bleu de la simulation (`rgba(30,136,229,.12)` pour le pas courant de la trace, alors que le
  moteur a `#1e88e5`) et écrit `#ffffff` en dur pour le bandeau de fin. La règle `.simulation-popup
  .simulation-entries` répète `.simulation-entries`. Il faudrait passer la couleur par une variable CSS posée depuis
  le moteur, et retirer la règle en double.
