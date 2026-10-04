# SUMMARY — Drawio Spatial (contexte pour une IA)

> Destinataire : un agent IA qui doit **rédiger une spec / un sujet de backlog** pour ce projet sans relire tout le
> code. Ce fichier est un point d'entrée dense ; la référence complète reste `docs/SPEC.md` (§ cités ci-dessous).
> Langue du projet : **français** (docs, backlog, messages de commit, libellés UI). Le code est en anglais.

---

## 1. Contexte en une minute

- **Quoi** : visionneuse puis éditeur de fichiers **draw.io** (`.drawio`) dans un espace **2D / isométrique / 3D**,
  livré comme **composant React** `<DrawioSpatial />`, appli web de démo et appli native **Electron**.
- **Pourquoi** : poser des idées spatialement (archi, doc technique) **sans quitter le format draw.io**. Principe
  fondateur : « la 3D est un mode, pas une rupture » — en vue de dessus on retrouve draw.io ; en inclinant la caméra,
  le même schéma devient des volumes posés au sol.
- **Contrat absolu** : **100 % compatible draw.io**. Un fichier ouvert puis sauvegardé ici s'ouvre dans draw.io
  identique, sauf ce que l'utilisateur a modifié. Les comportements d'édition **imitent draw.io** (valeurs, styles,
  géométries, algorithmes portés de mxGraph quand c'est possible).
- **Milestones** (SPEC §2) : M1 Viewer (fait), M2 Editor (en cours, surtout formes et UI d'édition), M3 Packaging
  (composant + Electron faits).

## 2. Stack et environnement

- TypeScript strict, **Three.js** (rendu), **troika-three-text** (texte SDF, Roboto), React 19 (coquille UI
  uniquement), Vite, Vitest, pako (pages compressées), @xmldom/xmldom (même DOM navigateur / Node).
- **Tout passe par Docker** (Node 24.21.0 figé par l'image), via `make` :
  `make dev` (serveur hot reload, port 5173), `make test`, `make lint`, `make check` (lint + types + format + tests),
  `make drawio-check` (fait réenregistrer/exporter les fixtures par le draw.io installé sur la machine et compare),
  `make lib` (→ `dist-lib/`), `make desktop*` (Electron, → `dist-desktop/`).
- Un sujet est terminé quand `make check` passe ; commit en français, pushes faits à la main.

## 3. Architecture (SPEC §4)

Couches, dépendances descendantes uniquement :

```
UI React (src/react = composant, src/app = appli de démo : palette, panneaux, onglets)
Interaction   src/engine/interaction  caméra, contrôles, sélection, pick, transitions, historique, mini-carte
Édition       src/engine/edit         déplacement, poignées, bouts/points de flèche, styles, palette, undo, autosave
Rendu         src/engine/render       registre de formes, scènes Three.js par page et par niveau (flat/iso/volume)
Modèle neutre src/engine/model        DocumentModel, PageModel, ShapeModel, EdgeModel, LinkModel (aucune notion draw.io)
Format        src/engine/format       decode, parse (XML→modèle), style, xmlTree, edit/write (écriture in situ)
Persistance   src/engine/persistence  FileStore : MemoryStore, IndexedDbStore, FsStore (Electron)
```

Règles :
- **Moteur sans React** (`src/engine/Engine.ts` = façade publique, événements dans `events.ts`). React ne fait que monter
  le canvas, passer le fichier et relayer des callbacks.
- Le rendu consomme le modèle neutre, **jamais le XML** ; le parsing ne connaît ni Three.js ni React.
- **Écriture in situ** (SPEC §14.2) : on ne régénère **jamais** le XML depuis le modèle. On garde l'arbre XML d'origine
  et on ne touche que les nœuds/attributs concernés ; tout ce qui est inconnu est préservé. Après une création, le
  modèle est relu de l'arbre. Une page compressée modifiée est réécrite compressée.
- **Undo/redo** par instantanés XML (100 max).
- **Jamais d'échec de chargement** pour une forme inconnue : placeholder gris pointillé + entrée dans les Diagnostics
  (`diagnostics/unsupportedStyles.ts`), qui sert de backlog priorisé par fréquence (SPEC §8.4).

## 4. Fonctionnel acquis (résumé)

- **Vues** (SPEC §9) : `top` (ortho, comme draw.io), `iso` (même caméra inclinée, isométrie vraie par défaut, azimut et
  élévation réglables), `3d` (perspective, orbite clic droit). Bascules animées avec fondu enchaîné, volumes qui
  « poussent ». Réinitialiser la vue, rotation à la souris en iso/3D.
- **Volumes** : formes = blocs d'épaisseur `view.isoDepth` (32 px) ou `spatial.height` ; formes contenues posées sur leur
  conteneur ; arêtes au sol. Formes de stockage (BDD `cylinder3`, file, cache `datastore`) rendues en « bâtiments »
  iso avec façades gravées (`render/iso/buildings.ts`).
- **Navigation** : pages en onglets, liens entre pages (intention puis engagement, transition zoom + fondu), retour /
  historique, vue graphe de la documentation, mini-carte, fond et grille.
- **Formes supportées** (`render/shapes/`) : rectangle (arrondi), ellipse, texte, groupe, stockage, **losange**
  (premier de la série géométrique, socle commun posé à l'étape 21), placeholder.
- **Flèches** (`render/edges/`) : routeurs draw.io portés tels quels (orthogonal, segment, elbow, side-to-side,
  top-to-bottom, entity-relation, loop), pointes draw.io, labels principal + début/fin, bouts fixes/auto/libres,
  découpage en morceaux (éditeurs mxGraph portés), cohérence au déplacement. Vérifiés **au pixel** contre les exports SVG
  de draw.io (fixtures `edge-routing`, `edge-points`, `edge-ends`).
- **Édition** : palette par catégories avec recherche (`edit/palette.ts` : `SHAPE_TEMPLATES`, `PALETTE_CATEGORIES`),
  glisser-déposer, déplacement, redimensionnement, texte riche édité en place, panneau contextuel (Page / Forme /
  Flèche / N formes / Texte : styles draw.io, bordure, volume), pages ajoutées/renommées/supprimées, liens, sauvegarde
  et autosave.
- **Paramètres** (SPEC §13, `engine/settings.ts`) : tout le ressenti UX est réglable, persisté, appliqué à chaud.
- **Attributs spatiaux** (SPEC §14.3, `engine/spatial.ts`) : préfixe `spatial.` dans le style ou sur
  `<object>/<UserObject>` (`spatial.height`, `elevation`, `tag`, `nodes`, `noLinkBadge`) ; `spatial.view` sur
  `<diagram>` = état de vue par page. Survivent à une sauvegarde dans draw.io (vérifié par `make drawio-check`).

## 5. Où regarder selon le type de sujet

| Sujet | Lire d'abord |
|---|---|
| Nouvelle forme draw.io | `docs/AJOUTER_UNE_FORME.md` (parcours complet : style → kind → registre → rendus 2D/iso/3D/mini-carte, clic, flèches, diagnostics, palette, fixture) ; exemple récent : `render/shapes/rhombus.ts`, `render/geometry/orient.ts` ; sujets `todo/33…41` comme modèles de rédaction |
| Comportement d'édition | SPEC §14, `src/engine/edit/`, `src/engine/format/edit.ts` |
| Rendu / caméra / vues | SPEC §8–9, `render/pageScene.ts`, `render/sceneManager.ts`, `interaction/camera.ts` |
| UI de l'appli de démo | `src/app/` (`App.tsx`, `Palette.tsx`, `ContextPanel.tsx`, `SettingsPanel.tsx`, `DiagnosticsPanel.tsx`, `main.css`) |
| API du composant | `docs/COMPOSANT.md`, `src/react/DrawioSpatial.tsx`, `src/index.ts` |
| Paramètre nouveau | SPEC §13, `engine/settings.ts`, `tests/settings.test.ts`, `src/app/SettingsPanel.tsx` |
| Fichier draw.io / compat | SPEC §7, §14.2, §15 ; fixtures `tests/fixtures/*.drawio`, sorties draw.io versionnées dans `tests/fixtures/drawio-saved/` |

## 6. Backlog : comment écrire une spec ici

Organisation complète : `docs/ROADMAP.md`. Essentiel :

- Un sujet = **un fichier** `docs/backlogs/{idea,todo,done}/NN-sujet-en-kebab-case.md`.
- `NN` = **numéro unique jamais réutilisé** : prendre le plus grand existant (tous dossiers confondus) + 1.
  Au moment de la rédaction de ce résumé, le plus grand est **47** → prochain sujet **48** (vérifier avec
  `ls docs/backlogs/*/`).
- `idea/` : une ligne suffit. `todo/` : précis, avec **valeurs exactes de draw.io** (style, tailles, attributs) et un
  critère **« Fini quand : »** vérifiable à l'œil dans l'appli et, si le fichier est touché, dans draw.io.
  `done/` : jamais modifié ensuite ; on y ajoute « Fait : » au moment du commit (`git mv` dans le même commit).
- Gabarit :

```markdown
# Titre du sujet

> Milestone ou thème de rattachement (ex. « Milestone 5 — Formes géométriques »), dépendances (numéros)

- Ce qu'on veut, avec les valeurs exactes de draw.io quand il y en a.
- Comportement dans les trois vues (2D, iso, 3D) et la mini-carte si pertinent.
- Écarts assumés avec draw.io, s'il y en a (à expliciter).
- **Fini quand :** critère vérifiable.
```

Attendus implicites d'une bonne spec ici :
- préciser ce qui est **écrit dans le XML** (quels attributs, où, format draw.io) et ce qui ne l'est pas ;
- penser **annulation** (une étape, avec libellé), **sélection multiple**, **autosave**, **paramètre** éventuel ;
- prévoir la validation contre draw.io (fixture + `make drawio-check`) dès qu'on touche au fichier ;
- si une SPEC § change, la mettre à jour (la SPEC décrit l'état réalisé, pas seulement l'intention).

## 7. Hors périmètre (sauf décision contraire)

Collaboration temps réel, export image/PDF, rotation des formes et ports (`sourcePort`) dans le routage, `.dmg` /
notarisation macOS.
