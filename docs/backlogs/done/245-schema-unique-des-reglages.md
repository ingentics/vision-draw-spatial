# Schéma unique des réglages

> Dette technique du moteur (paramètres) ; sortie de 210

- Aujourd'hui, ajouter un réglage touche quatre fichiers : `settings/types.ts`, `defaults.ts`, `limits.ts` et
  `merge/*`. Les fusions sont presque toutes mécaniques (`num`, `bool`, `oneOf`, `color`, une ligne par réglage).
- **Cible : deux fichiers.** Les interfaces de `types.ts` restent écrites à la main (leurs commentaires documentent
  SPEC §13). `defaults.ts`, `limits.ts` et `merge/*` sont remplacés par un descripteur par section, typé
  `SettingsSchema<ViewSettings>` (le compilateur exige une entrée par champ de l'interface) :
  `isoAngleDeg: number(ISOMETRIC_ELEVATION_DEG, { min: 10, max: 80, step: 1 })`, `defaultMode: oneOf(VIEW_MODES, 'top')`,
  `isoVolume: flag(true)`…
- Une seule fonction de fusion générique ; un validateur sur mesure pour les cas particuliers (`presets`,
  `textPresets`, `serverUrl`, `controls` et ses raccourcis) ; un `fix` facultatif par section pour les règles qui
  lient deux champs (caméra : minimum ≤ maximum).
- `DEFAULT_SETTINGS` et `SETTINGS_LIMITS` restent exportés, calculés depuis le schéma : les appelants ne changent pas.
- **Aucune clé ne change** (réglages enregistrés des utilisateurs). Migration section par section, en commençant par
  `transition` et `view`.
- Avant de supprimer l'ancienne fusion : test jetable qui compare l'ancien et le nouveau `mergeSettings` sur de
  nombreuses entrées abîmées (mauvais types, hors bornes, hors liste, min > max, sections absentes) ; tout écart est
  écrit dans la ligne « Fait : ».
- **Fini quand :** ajouter un réglage simple touche `types.ts` et le schéma seulement ; `defaults.ts`, `limits.ts` et
  `merge/` n'existent plus ; les tests existants de `tests/engine/settings.test.ts` passent sans changement hors imports ; le
  test comparatif ne montre aucun écart ; les réglages enregistrés se rechargent à l'identique dans l'appli
  (panneau des paramètres, port 5173) ; `make check` vert.
- Fait : `settings/defaults.ts`, `limits.ts`, `validate.ts` et `merge/` remplacés par :
  - `settings/fields.ts` : briques du schéma (`number(défaut, bornes, { integer })`, `flag`, `oneOf`, `code`, `color`,
    `custom`, et les lectures `presets`, `textPresets`, `serverUrl`) et type `Spec<T>`, qui exige une entrée par champ
    de l'interface ;
  - `settings/schema/` (`navigation`, `view`, `shapes`, `workspace`, `index`) : un descripteur par section, rangé comme
    les anciennes fusions ; `SECTION_FIXES` pour la règle caméra (`orderedZooms`) ; les contrôles prennent leurs défauts
    dans `DEFAULT_CONTROLS` / `DEFAULT_SHORTCUTS`, qui restent leur source ;
  - `settings/fromSchema.ts` : `DEFAULT_SETTINGS`, `SETTINGS_LIMITS` (clés typées `view.isoDepth`,
    `panels.left.width`… déduites du schéma) et `mergeSettings` générique. Mêmes exports publics.
  - Ajouter un réglage simple : son champ dans `types.ts` et une ligne dans le schéma. 1 183 → 1 000 lignes.
  - Test comparatif jetable (supprimé avec la copie de l'ancien code) : défauts et bornes identiques, et
    30 000 fusions sur des entrées abîmées (mauvais types, NaN, hors bornes, hors liste, sections et sous-objets d'un
    mauvais type, effets) sans écart ; un sabotage volontaire (arrondi retiré) est bien détecté.
  - Écarts : aucun écart de valeur. L'ordre des clés dans `shapes` suit désormais le schéma ; `DEFAULT_SETTINGS.controls`
    est une copie de `DEFAULT_CONTROLS` (plus le même objet). La règle caméra ne peut d'ailleurs jamais servir avec les
    bornes actuelles (minimum ≤ 1 ≤ maximum), elle reste pour le cas où elles changeraient.
  - Test ajouté : chaque valeur par défaut numérique est dans ses bornes. Docs mises à jour (`AJOUTER_UNE_FORME.md`
    §12, SPEC §13, `SUMMARY.md`).
  - Vérifié dans l'appli (port 5173) : réglages enregistrés modifiés puis rechargés (durée de bascule 900 ms reprise,
    champ de vision 999 ramené à 100°, largeur de barre 250,4 arrondie à 250, accent rouge appliqué). `make check` vert.
