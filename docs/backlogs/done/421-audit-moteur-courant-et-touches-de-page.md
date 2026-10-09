# Audit qualité — ajouts moteur des sujets 414, 415 et 418, 1re passe

> Audit (procédure `docs/AUDIT.md`, copiée et remplie ici ; `docs/AUDIT.md` reste le modèle vierge). Lancé le
> 2026-10-09. Suite de 414 (couche physique RDD), 415 (touches de page d'un mode), 418 (Tab, courant suivant). Ce
> fichier décrit la tâche et en suit l'avancement ; les constats deviennent des tickets.

## Objectif

Les ajouts au moteur faits pour le mode RDD sont génériques (aucun nom de mode dans le tronc), réutilisent les briques
existantes, sont testés côté moteur et décrits juste dans `AJOUTER_UN_MODE.md`.

## Périmètre

- **Prioritaire** : le moteur touché par 414, 415, 418 — `core/domains/modes/` (`modeCurrents.ts`, `pageModes.ts`,
  `shapeParts.ts`, `modePanel.ts`), `core/domains/edit/text/labelEditor.ts`, `core/interaction/controls/keyboard.ts`
  et `host.ts`, `core/modes/types.ts`, `core/plugins/index.ts`.
- **Secondaire** : leur usage par le plugin RDD (`plugins/modes/rdd/tables/physicalLayer.ts`,
  `editing/fieldParts.ts`), pour voir si l'API suffit.
- **Docs** : `docs/AJOUTER_UN_MODE.md` (sections 4, 5, parties, tableau des appels), `docs/SPEC.md` (couches RDD).
- **Hors périmètre** : le reste du plugin RDD (rendu des tables, panneau), l'appli ; tout changement de comportement
  visible.

## Axes d'analyse

1. Découplage : le tronc ne connaît pas RDD ; l'API (`current.redraws`, `labelPart`, `pageKeys`, `ModePartText.bold`,
   courant remis à `dressing` et aux textes des parties) est complète et utilisée.
2. Mutualisation : pas de séquence ni de calcul refaits à côté d'une brique existante.
3. Responsabilités et patterns : chaque domaine garde son état, appels au mode protégés.
4. Erreurs réelles.
5. Tests côté moteur de chaque ajout.
6. Docs alignées sur le code.

## Constats (2026-10-09)

**Ce qui est sain** : aucun nom de mode ni identifiant RDD dans `core/` ; tous les appels au mode passent par l'hôte
protégé (`pageModes.call` / `guard`, `shapeParts.call`) ; le courant reste un état de session de `ModeCurrents`, lu
par les autres domaines via `getModeCurrent` ; Tab ne part que de la zone de dessin (`isPageKeyCandidate` :
`event.target === element`), donc jamais d'un éditeur de texte ; `isPageKeyCandidate` est une fonction pure testée ;
habillage par clé de style dessinée (`layerStyle`) : même canal que le fond éclairci des régions, le style draw.io
n'est pas touché ; `AJOUTER_UN_MODE.md` décrit `redraws`, `labelPart`, `pageKeys` et le Tab par défaut, tableau des
appels compris ; tests `modeCurrents.test.ts`, `modePageKeys.test.ts`, `partTexts.test.ts`, `controls.test.ts`.

**Erreurs réelles** : aucune trouvée. Fragilité non reproduite : `ShapeParts.setText` (`shapeParts.ts:308`) lit le
courant à la validation et non à l'ouverture de l'éditeur ; si le courant changeait éditeur ouvert, le texte saisi
en couche physique serait écrit comme nom logique. Aujourd'hui impossible : Tab dans l'éditeur ne bascule pas, et un
clic sur la barre valide l'éditeur avant (`richEditor.ts:144`, `pointerdown` en capture). → dette (ligne).

**Ce qui freine l'extensibilité** : `pageKeys` (415) n'a plus aucun utilisateur dans `src/` depuis que RDD a pris le
Tab du moteur (414, 418) ; Séquences n'en a pas. Point d'extension documenté et testé, gardé comme surcharge du Tab
par défaut. → rien (décision : garder), sauf avis contraire.

**Mutualisation et responsabilités** :

- `ModeCurrents.redraw` (`modeCurrents.ts:136-145`) réécrit la séquence de reconstruction des scènes d'une page
  (`scenes.invalidate`, `graph.invalidateWithScenes`, `scenes.show`, `levels.applyHeightScale`, `highlight.update`,
  `minimap.invalidate`), déjà présente en variantes dans `levels.rebuildScenes` (`levels.ts:127`, toutes les pages)
  et `file.documentChanged` (`file.ts:222-235`). Le domaine des courants orchestre ainsi cinq autres domaines. → A
- `LabelEditor.editPartLabel` (`labelEditor.ts:153`) recompose à la main le champ de bits `fontStyle`
  (`(bold ? 1 : 0) | (italic ? 2 : 0)`) alors que `fontStyleValue` existe (`model/styleValues.ts:44`, déjà utilisé
  par RDD `table.ts:181`). → B

**Tests** : `ModePartText.bold` (éditeur en gras) et la redirection de `editLabel` vers la partie de `labelPart`
(`labelEditor.ts:102-105`) ne sont testés que par le plugin RDD, pas dans le moteur
(`labelEditorPart.test.ts` : deux cas, ni gras ni `labelPart`). → B

**Docs** : `AJOUTER_UN_MODE.md:232` liste les options de l'éditeur d'une partie (`transparent`, `center`, `color`)
sans `bold` (414) ni `italic`, `multiline`, `monospace`. → C

## Sujets

| #   | Sujet                                                                                           | Gain                                            | Taille | Décision |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------ | -------- |
| A   | Reconstruction des scènes d'une page en une méthode commune (appelée par `ModeCurrents.redraw`) | une seule séquence de redessin, moins de couplage | S      | fait |
| B   | `editPartLabel` par `fontStyleValue` ; tests moteur du gras et de `labelPart` dans `editLabel`  | réutilisation, couverture moteur                | S      | fait |
| C   | `AJOUTER_UN_MODE.md` : options complètes de `ModePartText`                                      | doc juste pour un nouveau mode                  | S      | fait |
| —   | Dette : courant de `setText` lu à la validation (ligne dans `docs/backlogs/debt/`)              | —                                               | —      | notée (422) |

Ordre suivi (validé) : B, C, A, dans ce seul ticket (petite passe) : un commit `refactor(engine)`. Aucun écart de
comportement attendu.

- **Fini quand :** les sujets validés sont faits, `make check` vert, Tab et l'édition sur place en couche physique
  (fixture `rdd-couches.drawio`) se comportent comme avant dans l'appli.

## Avancement

- [x] Tâche décrite (ce fichier)
- [x] Constats
- [x] Sujets rédigés
- [x] Sujets validés par l'utilisateur
- [x] Réalisation

- Fait : B — `LabelEditor.editPartLabel` écrit `fontStyle` par `fontStyleValue(text)` (`labelEditor.ts`) ; tests
  moteur ajoutés à `labelEditorPart.test.ts` (gras, gras + italique ; `editLabel` passe à la partie de `labelPart`).
  C — `AJOUTER_UN_MODE.md` (parties) : options de `ModePartText` complètes (`bold`, `italic`, `multiline`,
  `monospace`). A — `Levels.rebuildScenes(pageIds?)` (`view/levels.ts`) : sans argument, toutes les scènes (comme
  avant) ; avec des pages, leurs scènes et celles de la vue graphe, puis la page courante réaffichée (hauteur des
  volumes, mise en valeur, mini-carte, rendu). Appelée par `ModeCurrents.chooseCurrent` (méthode `redraw` supprimée)
  et par `DocumentFile.documentChanged` (`file.ts`), qui n'enchaînent plus eux-mêmes ces domaines. Tests :
  `view/levels.test.ts` (nouveau, les deux cas) ; `modeCurrents.test.ts` et `file.test.ts` adaptés, car ils
  traçaient la séquence interne désormais dans `Levels` (l'ordre des étapes est vérifié par `levels.test.ts`).
  `pageKeys` gardé. Dette notée : 422 (courant lu à la validation de `setText`). Écarts de comportement, invisibles :
  `documentChanged` met à jour la mise en valeur et demande une image une fois de plus (avant la reprise de la
  sélection) ; un changement de courant `redraws` sur une page qui n'est pas la courante réaffiche maintenant la page
  courante (avant : rien, alors que la scène de la vue graphe venait d'être lâchée). `make check` vert. Vérifié dans
  l'appli (`rdd-couches.drawio`) : Tab et la barre basculent la couche, tables redessinées ; double-clic sur le titre
  en couche physique : éditeur en gras sur le `dbName`, validé (nom changé, nom logique intact), annulé.
