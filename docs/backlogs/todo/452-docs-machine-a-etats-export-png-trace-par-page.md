# Docs : Machine à états, export PNG, tracé par page, export d'un mode

> Audit 444 — docs (reprises de 431, 433 à 436, 439, 441 à 443)

- `SPEC.md` :
  - Une section « Mode Machine à états » : état, contenu, points d'entrée et de sortie, sortie en erreur,
    transitions et leurs règles, ensemble d'états, réglages de page posés (ancrage, tracé), export PlantUML.
  - Une section « Export d'image » : bouton de la barre, densité, marge, fond transparent, page ou sélection, nom du
    fichier. La mention « hors périmètre » de la ligne 26 est corrigée.
  - L'attribut `spatial.edgeLine` dans la table des attributs, et le tracé imposé par l'ancrage (arrondi seul en
    automatique, droite en Typon) dans la ligne « Tracé » (`:500`).
  - L'export PlantUML décrit comme commun aux modes.
- `SUMMARY.md` : le mode `states` et l'export d'image dans la carte et dans « où regarder ».
- `AJOUTER_UN_MODE.md:171` : comment un mode offre un export, avec `ExportDialog` (`format`, `source`, `exporters`,
  `children`) et l'aperçu choisi par `format.id`.
- `app/plugins/modes/registry.ts:18` : chemin `src/engine/plugins/modes/<id>/`.
- Écart de comportement : aucun.
- **Fini quand :** chaque chemin et chaque nom d'API cités existent, et les tests des docs (`docs.test` ou équivalent)
  passent.
