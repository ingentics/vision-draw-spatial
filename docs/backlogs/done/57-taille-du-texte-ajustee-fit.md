# Taille du texte « Ajuster » (fit) dans une forme

> Itération — édition du texte (format du texte) ; reprise de la taille du texte du panneau contextuel

- **Option « Ajuster »** dans le format du texte, à côté du réglage de taille (`app/TextFormat.tsx`), seulement pour
  le texte d'une **forme** (pas d'une flèche). C'est un interrupteur qui vaut pour tout le texte :
  - activée, le réglage de taille (−, champ, +) est **remplacé** par l'indication de la taille obtenue, non éditable ;
  - désactivée, le réglage de taille revient, avec la dernière taille réglée à la main.
- **Comportement** : la taille réglée (`fontSize`, 11 px par défaut) reste la taille maximale. Si le texte, à cette
  taille, dépasse la zone de texte de la forme (largeur et hauteur, marges comprises, retour à la ligne appliqué), la
  taille est réduite jusqu'à ce qu'il tienne. **La réduction s'arrête à 1 pt** : en dessous, on garde 1 pt et le texte
  déborde. Un texte qui tient déjà n'est pas agrandi.
- **Recalcul en direct** : pendant la saisie, au redimensionnement de la forme, au changement de police, de style ou
  de contenu, et à l'ouverture d'un fichier.
- **Texte riche** : la réduction s'applique au texte entier, à proportion (les tailles partielles `<span
  style="font-size">` gardent leur rapport à la taille de base).
- **Fichier** : la clé `fitText=1` (inconnue de draw.io, conservée telle quelle) mémorise le mode ; `fontSize` garde
  la taille réglée (taille maximale). La taille ajustée n'est pas écrite : draw.io dessine le texte à la taille
  réglée (choix du 4 oct. 2026).
- Une étape d'annulation par activation / désactivation ; les recalculs automatiques n'en créent pas.
- SPEC §14.1 (Éditer un texte) mise à jour.
- **Fini quand :** dans un rectangle, « Ajuster » activé, taper un long texte le fait rétrécir pour rester dans la
  forme ; agrandir la forme le fait regrossir jusqu'à la taille réglée, sans la dépasser ; une forme minuscule donne
  un texte à 1 pt qui déborde ; désactiver rend le réglage de taille ; le fichier réenregistré par draw.io garde
  `fitText=1` (`make drawio-check`) ; tests du calcul de la taille ajustée ; `make check` vert.
- Fait : calcul pur `fitFontSize` / `largestFitting` / `scaleRichLines` (`render/richLayout.ts`) : taille réglée si
  le texte tient, sinon plus grande taille entière qui tient (dichotomie), jamais sous `MIN_FIT_SIZE` (1). Rendu :
  `createLabel` (`render/flat/box.ts`) passe la zone de texte (marges déduites) en `TextSpec.fit`, et la fabrique
  troika met alors le texte en page elle-même (`createRich`) à la taille ajustée. Éditeur en place
  (`app/LabelEditor.tsx`) : même recherche mesurée dans le DOM (CSS `zoom` sur le texte), relancée à chaque saisie
  ou mise en forme (`MutationObserver`) et quand la boîte change ; il remonte la taille au panneau. Panneau
  (`app/TextFormat.tsx`) : bouton « Ajuster » à côté de la taille (formes seulement), qui remplace −/champ/+ par
  la taille obtenue ; `fitText=1` via `setTextFormat` (une étape d'annulation). Choix pour draw.io : option « B »,
  `fontSize` garde la taille réglée, rien d'autre n'est écrit. Tests : `tests/engine/render/richLayout.test.ts`
  (tient déjà, largeur, hauteur, retour à la ligne, minimum 1, texte riche) ; `fitText=1` ajouté à
  `tests/fixtures/spatial.drawio`, vérifié par `make drawio-check` (`spatial.test.ts` compare `fitText` avant et
  après réenregistrement). Vérifié dans l'appli : texte long réduit de 12 à 11 dans un rectangle, éditeur et label
  dessiné identiques (mêmes retours à la ligne) ; rétréci, le texte rapetisse ; agrandi, il revient à 12 sans le
  dépasser ; désactiver rend le réglage de taille. SPEC §14.1 mise à jour.
