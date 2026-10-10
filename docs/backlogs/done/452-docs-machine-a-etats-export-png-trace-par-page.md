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
- Fait :
  - `SPEC.md` :
    - §2 : PDF et SVG hors périmètre, PNG renvoyé à §14.6.
    - Ligne « Tracé d'une flèche » : tracé des flèches créées par page (`spatial.edgeLine`), borné par l'ancrage
      (arrondi seul en automatique, droite en Typon), table `EDGE_LINE_STYLES`.
    - §14.3 : lignes `spatial.anchoring`, `spatial.edgeLine`, `spatial.sm.body`, `spatial.sm.error` ; espace de noms
      `sm`.
    - §14.5 : « Règles de page d'un mode » (`page.defaults`, `edges.attachedEnds`, `styleable: false`) ; export
      PlantUML commun aux deux modes (`PLANTUML_FORMAT`) ; section « Mode Machine à états » (état, points, transition,
      ensemble, export).
    - §14.6 (nouveau) : export d'image.
  - `SUMMARY.md` : le mode Machine à états et l'export d'image dans ce qui existe ; `plugins/modes/states/` en
    exemple d'un nouveau mode.
  - `AJOUTER_UN_MODE.md` : « Offrir un export » (texte et format côté moteur, `ExportDialog` côté appli, rendu choisi
    par `format.id`, choix propres en `children`).
  - `app/plugins/modes/registry.ts` : chemin `src/engine/plugins/modes/<id>/`.
  - `guides.test.ts` : `PREVIEWS` cité par le guide, hors de l'API des plugins.
  - Écart de comportement : aucun. `make check` vert (tests des docs compris).
