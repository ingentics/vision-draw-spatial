# Groupe d'icônes avec bouton « Défaut »

> Itération — interface (panneau de contexte, paramètres). Socle des sujets 318 et 319.

- Un composant unique de choix par boutons, au style des groupes existants (`button-group` / `group-button` : tracé
  de la flèche dans `ContextPanel.tsx`, `Choice` dans `SettingsPanel.tsx`) : chaque option a une icône SVG 16 × 16
  (ou 18 × 18 comme `ArrangeIcon`), son nom en infobulle, `role="radio"`.
- Option « Défaut » facultative, en tête du groupe : enfoncée quand la valeur n'est pas écrite (héritage de la page
  ou des paramètres) ; son infobulle dit la valeur héritée (« Par défaut : Arc »). Cliquer dessus efface la valeur.
  Réutilisable partout où une liste a aujourd'hui « Par défaut (…) ».
- Une valeur inconnue (écrite par une version plus récente ou par draw.io) reste visible : aucun bouton enfoncé et
  la valeur dans l'infobulle du groupe, comme les « Inconnu (…) » / « (non dessiné) » des listes actuelles.
- `Choice` (paramètres) et le tracé de la flèche passent sur ce composant ; les options texte restent permises (sans
  icône) pour les choix qui ne se dessinent pas.
- Premiers usages, dans ce sujet :
  - **Aligner › Par rapport à** (`ArrangeSection.tsx`) : Sélection / Premier / Dernier sélectionné, icônes dans le
    style d'`ArrangeIcon` (référence en contour : cadre englobant, première forme, dernière forme).
  - **Mode de la page** (`ContextPanel.tsx`, `PageModeSections`) : « Aucun » puis un bouton par mode avec l'icône
    déjà déclarée par le mode (`icon` de `engine/plugins/modes/<id>/index.ts`) ; l'infobulle reprend
    `mode.description`.
- **Fini quand :** dans l'appli, la référence d'alignement et le mode de page se choisissent par icônes, le bouton
  actif est visible, l'infobulle nomme chaque choix ; un mode inconnu reste affiché ; le tracé de la flèche et les
  choix des paramètres n'ont pas changé d'aspect ni de comportement.
- Fait : composant `ChoiceGroup` (`src/app/ChoiceGroup.tsx`) : options icône ou texte (nom en infobulle et
  `aria-label`), bouton « Défaut » en tête avec `inherited` (infobulle « Par défaut : … », clic = valeur effacée),
  grille avec `columns` ; une valeur inconnue n'enfonce aucun bouton, est dite dans l'infobulle du groupe et le cadre
  passe en pointillé d'accent. `Choice` (paramètres) et le tracé de la flèche passent dessus (même aspect). Aligner ›
  Par rapport à : trois icônes au style d'`ArrangeIcon` (cadre englobant, première, dernière forme en contour). Mode
  de la page : « Aucun » puis l'icône de chaque mode (`ModeIcon`, extrait de `PageTabs.tsx`), infobulle « nom :
  description » ; un mode sans icône montrerait son nom court. Changement mineur : un ancrage ou un saut de page
  écrit mais inconnu n'apparaît plus comme « Par défaut » mais comme valeur inconnue. Vérifié à l'œil
  (`fixtures/edge-ends.drawio`, sélection multiple, page) ; `make check`.
  Infobulles : celles de la palette (fond sombre, fondu), extraites de `Palette.tsx` en `useTooltip`
  (`src/app/Tooltip.tsx`, classe `.tooltip`, texte long à la ligne), à la place des `title` ; le `title` des lignes
  passe sur leur nom pour ne pas doubler celle des boutons ; une valeur inconnue est dite dans l'infobulle de chaque
  bouton. Chaque icône dit ce que fait le choix (et la clé draw.io écrite) ; « Défaut » dit d'où vient la valeur
  (« Défaut : rien n'est écrit, suit la page (Arc) ») ; règle ajoutée dans `.claude/rules/coding.md` §6.
