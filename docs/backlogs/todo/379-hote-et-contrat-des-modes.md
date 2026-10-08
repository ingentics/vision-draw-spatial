# Hôte des modes : lecture seule et protection posées une fois ; contrat et hôte découpés

> Architecture du moteur — extensibilité ; suite de 324 A ; après 378. Audit du 2026-10-08 (`AUDIT.md`).

- Constat :
  - `readonlyModel(` + `guard(` écrits à la main ≈ 40 fois : `pageModes.ts` (16), `shapeParts.ts` (14),
    `modeCurrents.ts` (8), `modeHandles.ts` (2) (ex. `shapeParts.ts:75,114,136,174,179,212`, `pageModes.ts:134,151,
    409-411`). Un oubli dans un nouveau point d'entrée est une brèche silencieuse. Le registre des formes, lui, le fait
    en un seul endroit.
  - `domains/modes/pageModes.ts` (467 lignes) fait trois métiers : requêtes et choix (`47-158`), réglages et touches
    du panneau (`210-306`), remises en ordre après écriture (`followUp`…`documentOpened`, `316-447`).
  - `core/modes/types.ts` (495 lignes) : définition (`22-337`), service `ModeEdit` et `ModeEditContext` (`343-396`),
    schéma de panneau `ModeProperty` (`398-463`), habillage (`466-490`). `'veil' | 'outline'` recopié
    (`types.ts:78`, `registry.ts:23`) au lieu de `Exclude<SelectionStyle, 'none'>`. Commentaire « (ex-`repair`) »
    (`types.ts:101`) historique.
  - `applyModeEdit` (`core/modes/modeEdits.ts:47-219`, 172 lignes, sept fermetures).
- Ce qu'on veut :
  - un adaptateur unique (`core/modes/modeCalls.ts` ou dans l'hôte) : `(mode, point d'entrée, repli, ...args)`, qui
    enveloppe chaque argument du modèle en lecture seule et protège l'appel (brique de 378) ; les quatre hôtes ne font
    plus que l'orchestration ;
  - `pageModes.ts` découpé : `modePanel.ts` (réglages, touches) et `modeFollowUps.ts` (remises en ordre) dans
    `core/domains/modes/` (noms à vérifier : pas de nom déjà pris, `coding.md` §2) ;
  - `core/modes/types.ts` découpé en `types.ts` (définition), `modeEdit.ts`, `modeProperty.ts`, `dressing.ts`, API
    des plugins inchangée ;
  - `applyModeEdit` en classe `ModeEditWriter` (une méthode par écriture, suivi des écritures en champs).
- Écart : aucun. Tests existants intacts sauf imports ; `contractDoc.test.ts` suit les nouveaux fichiers.
- **Fini quand :** `grep -c readonlyModel src/engine/core/domains/modes/*.ts` ne compte plus que l'adaptateur ; pages
  RDD et Séquences identiques à l'œil (glisser table et champ, tirer une relation, flux courant, export PlantUML) ;
  `make check` vert.
