# Police d'un mode fournie par l'appli

> Dette vue à l'audit 500 (reprise de 476) — tronc, appli

- `'Permanent Marker'` est écrit dans l'appli (`src/app/fonts.ts:23`) et dans le mode (`stickyLayout.ts:14`), liés
  par la seule chaîne ; une faute de frappe retombe sans bruit en Roboto (`pickFontKey`). Un mode ne peut pas livrer
  sa police, et aucun test ne vérifie que l'appli fournit celles que demandent les modes.
- Ce qu'on veut (repris le 2026-10-10, choix de l'utilisateur : déclarée et signalée) :
  - `PageModeDefinition.fonts` : polices nommées que le mode demande (Event storming : `Permanent Marker`, depuis
    `STICKY.labelFont`).
  - Le moteur connaît les polices fournies par l'hôte (`fonts.families`) ; à la lecture d'un document, une police
    demandée par le mode d'une de ses pages et non fournie est signalée une fois dans les Diagnostics :
    « Police « Permanent Marker » du mode Event storming non fournie : textes en Roboto ».
  - Test de l'appli : `FONTS.families` contient toutes les polices des modes par défaut.
- **Fini quand :** sans la police dans `FONTS`, ouvrir `eventstorming.drawio` montre l'avertissement dans les
  Diagnostics ; avec, rien ; `make check` vert.
- Fait : `PageModeDefinition.fonts` (`core/modes/types.ts`) ; Event storming déclare `[STICKY.labelFont]`.
  `EngineCore.providedFonts` (noms de `fonts.families`) ; `PageModes.withModeWarnings` ajoute, une fois par police et
  par document, « Police « … » du mode … non fournie : textes en Roboto » pour les modes des pages lues. Tests
  `pageModes.test.ts` (police absente signalée une fois pour deux pages, police fournie rien),
  `tests/app/fonts.test.ts` (l'appli fournit les polices des modes par défaut) ; `modeHost` des tests fournit
  `Permanent Marker`. Docs `AJOUTER_UN_MODE.md` (contrat et tableau des garanties), `COMPOSANT.md`. Écart : un
  avertissement de plus dans les Diagnostics quand l'hôte ne fournit pas la police (jamais avec l'appli). Vérifié
  dans l'appli sur `eventstorming-commande.drawio` : rien dans les Diagnostics ; polices fournies vidées puis fichier
  rechargé (par l'API du moteur) : l'avertissement apparaît dans Diagnostics › Avertissements ; page rechargée ensuite.
