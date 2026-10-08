---
paths:
  - "src/**"
  - "tests/**"
---

# Coding rules

> For an agent writing code in this repo: rules to follow from the start, so as not to create debt.
> Architecture: `docs/SUMMARY.md` §3, SPEC §4. Validation and commits: `CLAUDE.md`.

## 1. Before writing

- **Search before creating.** Before writing a small function (distance, center, inclusion, style reading, side
  normal…), check whether it exists (`grep -rn "function name" src/engine`). A local copy always ends up diverging
  (tolerance, argument order).
- **Read the guide for the kind of topic**: `docs/AJOUTER_UNE_FORME.md`, `docs/AJOUTER_UN_MODE.md`,
  `docs/COMPOSANT.md`, and the "Où regarder" table in `docs/SUMMARY.md` §5.
- **Imitate the neighbour.** A new file looks like the others in its folder: split, naming, comments.

## 2. Where code goes

Folder map with each folder's role: `docs/SUMMARY.md` §3 (single source). Where a given kind of code goes:

| Kind of code | Folder | Constraints |
|---|---|---|
| Pure computation on points and rectangles | `engine/core/model/geometry.ts` | no Three.js import |
| Reading / writing the draw.io file | `engine/core/format/` | no Three.js nor React; in-place writing (SPEC §14.2) |
| Pure editing rule (computation, stateless) | `engine/core/edit/` | receives its data as parameters |
| Camera geometry, transitions | `engine/core/interaction/` | pure |
| Engine state and orchestration | `engine/core/domains/<domain>/` | a domain owns its state |
| Three.js drawing | `engine/core/render/`, `engine/plugins/shapes/` | consumes the neutral model, never the XML |
| Plugin contract and registry (shape, mode, effect) | `engine/core/shapes/`, `core/modes/`, `core/effects/` | knows no plugin by name |
| Trunk building block offered to plugins | re-exported by `engine/core/plugins/index.ts` | the code stays in its trunk folder |
| A shape | `engine/plugins/shapes/<category>/<id>/` (shared bases: `shapes/generic/`) | `AJOUTER_UNE_FORME.md` |
| Anything specific to a mode | `engine/plugins/modes/<id>/` | nothing leaks out of the folder (`AJOUTER_UN_MODE.md`) |
| A page effect | `engine/plugins/effects/<id>/` | contract in `core/effects/types.ts` |
| React part of a mode (panel sections) | `src/app/plugins/modes/<id>/` | no rule: calls the mode's operations (`api.ts`) |
| UI | `src/app/`, `src/react/` | no business rule |

- **Pure logic apart from state.** A rule (tracing, alignment, bounds) is a pure function in `edit/`,
  `interaction/` or `model/` (under `engine/core/`), tested alone; the `core/domains/` domain only calls it with its
  state. E.g. `tracingOf(shapes, anchoring)` (`edit/anchoring/tracing.ts`) called by
  `core/domains/edit/edges/arrangement.ts`.
- **A common base, not a dependency between siblings.** If two variants share building blocks, these go in a
  common module of the parent folder; a variant never imports the other. E.g. automatic anchoring (`auto/`) and
  Typon (`pcb/`) share `edit/anchoring/routing.ts`.
- **No file name already taken.** Before creating `camera.ts`, `history.ts`, `selection.ts`, `handles.ts`…, check
  no file with that name exists elsewhere in the engine; otherwise use a name saying the role (`cameraMath.ts`,
  `selectionRules.ts`). Exception: the conventional files of a plugin folder (`index.ts`, `facade.ts`, `keys.ts`,
  `settings.ts`, `api.ts`), the same in every plugin by design.
- **No folder and file with the same name**: `route.ts` next to `route/` becomes `route/index.ts`.
- **Place a utility by what it is, not by its first caller.** Page geometry used by the document and by dragging
  goes in `model/`, not in the folder of the feature that created it.

## 3. State and coupling

- **No mutable module-level state** (`let` or object modified outside a class). All `Engine`s of a page would share
  it, and tests would influence each other. State lives in a `core/domains/` domain and is passed as a parameter to
  pure functions. Exception: a pure cache keyed by an immutable object (`WeakMap` keyed by a frozen `PageModel`, e.g.
  `plugins/modes/sequences/steps.ts`) is not state. E.g. camera bounds are `ViewCamera.limits`, passed as last parameter to `zoomAt`, `orbit`,
  `fitBounds`…
- **The document model is never modified in place.** Its pages are frozen in dev and test. A gesture preview edits
  the page's working copy (`core.file.livePage(pageId, owner)`, released by `settleLivePage(owner)` at the end of the
  gesture); a one-off computation edits a fresh `documentFromTree` page. Writes go to the XML tree, then the model is
  re-read (or the settled working copy becomes the page).
- **A domain does not write another's state.** No `this.core.pages.currentPageId = …` nor
  `this.core.camera.animation = undefined`: call a method of the owning domain, created if missing (e.g.
  `pages.setCurrent()`, `camera.cancelAnimation()`).
- **Use only what you need from the core.** Each domain receives the whole `core`; don't take the opportunity to
  touch other domains. If new code needs many domains, part of it is often a pure function to extract.
- **Each domain reacts itself to loading and settings.** A domain keeping document-related state has a
  `resetDocument()` registered in `EngineCore.resetDocumentState`; a domain depending on a setting has a
  `settingsChanged(settings, previous)` registered in `EngineCore.settingsChanged`. Neither `DocumentFile.load` nor
  `Config.updateSettings` decides for it.
- **The `Engine.ts` facade delegates, it does not compute.** One more public method only if the app or the
  component needs it.

## 4. Reuse what exists

- **Geometry**: `model/geometry.ts` (`distance`, `center`, `rectContains`, `rectContainsRect`, `boundsOfPoints`,
  `unionOf`, `segmentsCross`, `segmentIntersection`, `segmentDistance`, `insidePolygon`, `simplifyPath`,
  `prunePath`). No hand-written `Math.hypot(a.x - b.x, a.y - b.y)`. A missing function is added there, with its test
  in `tests/engine/core/model/geometry.test.ts`.
- **Style values**: `styleNumber`, `styleFlag`, `styleOpacity` (`model/styleValues.ts`), `styleColor`
  (`render/styleColors.ts`). No `parseFloat(style.x ?? '')` nor `style.x === '1'`.
- **Sides of a shape**: type `Side`, `SIDES`, `SIDE_NORMALS`, `pointOnSide`, `sideMiddle`, `sideSegment`, and anchor
  points `anchorPosition`, `nearestFreeAnchor` (`edit/edgeEnds.ts`). **Nearest handle on screen**: `nearestOnScreen`
  (`domains/selection/picking.ts`). **Anchorings**: `ANCHORINGS` (`edit/anchoring/mode.ts`).
  An existing list or table is not redeclared elsewhere.
- **Two close variants**: one shared parameterised function, and two names saying the difference, with a comment
  explaining why they differ. E.g. `prunePath(path, epsilon, keepBacktracks)` under `simplify` (rendering, keeps
  backtracks like draw.io) and `simplifyPath` (computed tracings, removes them).
- **Settings in families**: if a setting has variants (`edge…` / `edgePcb…`), read by prefix in a single function,
  not with an `if` and copy-paste. Never rename an existing setting key: users' saved settings would be lost.
- **Exception: code ported from mxGraph** (`render/edges/route/`, tracing editors) keeps its shape and signatures,
  to stay comparable with the original; adapt it with a thin layer, don't "simplify" it.

## 5. Boundaries

- **The engine knows neither React nor the app**; `format/` and `model/` know neither Three.js nor rendering
  (checked by `.eslintrc.cjs`).
- **The UI goes through the engine entry point** (`src/engine/index.ts`): `src/app/`, `src/react/` and
  `src/index.ts` import nothing else from the engine (checked by lint). If something is missing, export it there;
  `src/index.ts` (library API) only re-exports what is public.
- **Plugins (shapes, modes, effects) import from the trunk only the plugin API** (`engine/core/plugins/index.ts`),
  plus `three` and their own folder; a shape may also extend a shape of `plugins/shapes/`. A trunk building block a
  plugin needs is re-exported there (that is the decision to make it common). The trunk (`core/`) never imports a
  plugin: only the composition root `engine/plugins/index.ts` knows them. A plugin uses no dynamic `import()`, no
  `import.meta`, no browser globals (`window`, `document`, `globalThis`, storage, timers). Checked by lint and
  `tests/engine/plugins/boundaries.test.ts` (resolved paths). A shape never receives a DOM object (canvas, 2D
  context): a restricted brush (`MinimapBrush`).
- **A special case is not copied around.** A repeated test goes through a shared guard: transition in progress
  (`core.canInteract()`), graph view (`graph.isGraph(id)`), editable page (`targets.editablePage()`,
  `editablePageById(id)`); if none fits, create one.

## 6. Writing code

- English identifiers; comments in French.
- A comment says **why** (gap with draw.io, edge case, chosen value), not what the code already says. At the top of
  a non-obvious file: one line on its role. A value taken from draw.io says so
  (`/** Pas de la grille en pixels de page (draw.io : 10). */`).
- Strict TypeScript, no `any`; type imports as `import type` (lint).
- Short single-topic files: beyond ~400 lines, ask what can move out (shared blocks, algorithm, orchestration).
- No dead code nor accessor duplicating an existing method; a moved comment follows its code.
- **Every icon has a tooltip**, shown by `useTooltip` (`src/app/Tooltip.tsx`, same as the palette shape names), not
  a native `title` (and no `title` on an ancestor: it would show too), plus `aria-label` when the icon is the only
  content. It says not just the name but what the choice does, in French, with the draw.io key it writes when there
  is one (`Arc : la flèche saute l'autre par un petit arc (jumpStyle=arc)`). Choices by icons go through
  `ChoiceGroup` (`src/app/ChoiceGroup.tsx`, option `title`).

## 7. Tests and refactors

- **One test per rule**, in `tests/` at the path mirroring `src/` (`src/engine/core/model/geometry.ts` →
  `tests/engine/core/model/geometry.test.ts`). A refactor without behaviour change keeps tests intact except imports; a
  test claiming to check a case must really contain it.
- **A refactor announces its deviations.** Any behaviour change, even minimal, is written in the ticket's "Fait :"
  line. To replace two implementations with one, compare both on many inputs (throwaway test) before deleting the
  old one.
