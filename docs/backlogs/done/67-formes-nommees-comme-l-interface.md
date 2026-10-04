# Formes nommées comme l'interface : génériques et implémentations

> Itération — formes (registre, palette) ; reprise de 65 et 66

- **Une forme par élément de la palette**, nommée comme dans l'interface (en anglais) : `rectangle`,
  `rounded-rectangle`, `ellipse`, `circle`, `diamond` (« Losange »), `text`, `database`, `queue`,
  `distributed-cache`, `plug` (« Prise ») ; `group` hors palette.
- **Arborescence** :
  - `shapes/generic/` : bases à étendre, hors palette et hors registre : `box/` (contour → rendu 2D + bloc iso),
    `cylinder/` (tracés draw.io des cylindres, rendu 2D à lèvres), `building/` (bâtiment iso : toit, façades,
    étiquette) ;
  - `shapes/impl/<catégorie>/<forme>/index.ts` : les formes, rangées par catégorie de la palette (`general/`,
    `architecture/`) ou `internal/` (hors palette). Le registre collecte `impl/*/*/index.ts`.
- **Nom et correspondance** : une définition a un `id` (le nom du dossier) ; elle gère les formes draw.io `kinds`
  (défaut : `[id]`, le cas nominal) et, si besoin, une condition `matches` sur la forme (ex. `rounded=1`). Résolution :
  `ShapeModel.kind` égal à un `id` d'abord (`spatial.kind=database`), puis une définition qui gère ce `kind` avec une
  condition vérifiée, puis une définition sans condition.
- **Héritage** : une forme qui en étend une autre reprend sa définition et change ce dont elle a besoin
  (`rounded-rectangle` = `rectangle` + `rounded=1` ; `circle` = `ellipse` + `aspect=fixed` ; `database` et `queue`
  étendent `cylinder` et `building` ; `queue` gère `cylinder3` couché et `mxgraph.flowchart.direct_data`).
- **Palette** : chaque forme déclare au plus un élément (`palette`) ; l'identifiant du modèle est l'`id` de la forme ;
  la forme résolue est directement le modèle (`templateOf` disparaît). La catégorie déclarée doit être celle du
  dossier (vérifié par un test, comme `id` = nom du dossier).
- **`spatial.kind`** accepte le nom d'une forme de l'interface (`database`) en plus d'un nom draw.io.
- **Fini quand :** arborescence et noms ci-dessus ; palette, panneau, rendus identiques à l'œil ; une forme
  `spatial.kind=database` se dessine en BDD ; guide et SPEC à jour ; `make check` vert.
- Fait :
  - `shapes/generic/` : `box/` (fabrique `box(outline, options)`), `cylinder/` (tracés draw.io dont `cylinder3Drawing`,
    orientation, rendu 2D à lèvres), `building/` (briques du bâtiment iso, `tagProperty`). `shapes/minimap.ts` (repli
    mini-carte) à côté du registre.
  - `shapes/impl/general/` : `rectangle`, `rounded-rectangle` (étend `rectangle`, `rounded=1`), `ellipse`, `circle`
    (étend `ellipse`, `aspect=fixed`), `diamond` (`rhombus`), `text` ; `impl/architecture/` : `database` (+
    `facade.ts`), `queue` (`cylinder3` couché et `direct_data`, + `facade.ts`, `directData.ts`), `distributed-cache`
    (+ `facade.ts`), `plug` ; `impl/internal/group`. Chaque forme garde ses subtilités iso / 3D dans son dossier.
  - Contrat : `id` (remplace `kind`), `kinds` (défaut `[id]`), `matches` ; `palette` (un élément, identifiant = `id`)
    remplace `templates` / `templateOf`. Résolution du registre : condition vérifiée, puis `id` (`spatial.kind`), puis
    nom draw.io sans condition. Une forme imposée garde son orientation (BDD debout, queue couchée).
  - Tests : `tests/engine/shapes/registry.test.ts` (arborescence, `id` = dossier, catégorie = dossier, résolution,
    orientation imposée, réglages précis par forme) ; identifiants de palette mis à jour. Guide `AJOUTER_UNE_FORME.md` et
    SPEC §4.2, §8.2, §14.3 à jour.
  - Vérifié dans l'appli : palette inchangée, aperçus de style et étiquette « DB » d'une BDD, bâtiment iso ;
    `make check` vert.
