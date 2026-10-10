# Mode « Event storming » : post-it typés qui se touchent

> Milestone — mode Event storming ; modèles : Post-it (411) pour le papier, mode États (`plugins/modes/states/`) pour
> la palette réduite

On colle des post-it typés (événement, commande, acteur…) les uns contre les autres, comme sur un mur. Le fait que
deux post-it se touchent, et par quel côté, a un sens : ce sujet pose les formes et rend les contacts exacts et
lisibles ; leur interprétation (flux, règles, export) viendra plus tard, dans d'autres sujets.

- **Périmètre** : code moteur dans `src/engine/plugins/modes/eventstorming/` (formes du mode dans `shapes/`), partie
  appli dans `src/app/plugins/modes/eventstorming/` si besoin, plus `tests/`, `tests/fixtures/eventstorming.drawio` et
  la doc (SPEC, SUMMARY). Aucun changement dans `src/engine/core/` : un besoin du tronc découvert en route (police
  par forme, aimantation bord à bord) devient un ticket moteur à part.
- **Mode** de page « Event storming » (`spatial.mode=eventstorming`, espace de noms `es`, nom court « Event
  storming ») ; icône dédiée (trois petits post-it qui se touchent, orange, bleu, jaune). Vue de dessus
  (2D) seulement : iso et 3D ne sont pas permis (`viewModes: ['top']`, comme le mode États).
  **Palette** : les 8 post-it ci-dessous (catégorie « Event storming »), puis Texte (`text`) et Titre (`title`).
- **Les 8 post-it** : même papier que le Post-it (carré sans contour, ombre douce), 160 × 160 posé, chacun
  reconnu par son `spatial.kind` :

  | `spatial.kind` | Label | Fond | Exemples (dans l'infobulle de la palette) |
  | --- | --- | --- | --- |
  | `es-event` | Domain Event | `#ffb74d` (orange) | Commande passée, Paiement effectué |
  | `es-command` | Command | `#64b5f6` (bleu) | Passer commande, Payer |
  | `es-constraint` | Constraint | `#cfd8dc` (gris bleuté) | Pas plus que le stock disponible |
  | `es-system` | System | `#f48fb1` (rose) | Prestataire de paiement, ERP |
  | `es-policy` | Policy | `#ce93d8` (violet) | Quand le paiement échoue, prévenir |
  | `es-query` | Query Model | `#a5d6a7` (vert) | Historique des commandes, Stock |
  | `es-actor` | Actor | `#fff59d` (jaune clair) | Client, Administrateur |
  | `es-hotspot` | Hotspot | `#e57373` (rouge) | Règle floue, Goulot |

  - **Label** en haut, non modifiable : le nom du type en anglais (vocabulaire universel de l'event storming),
    en **gras**, police **feutre** (manuscrite type marqueur, par ex. Permanent Marker en `.woff` via `@fontsource`,
    ajoutée par `make lock`), 16, noir à 80 %, centré, à 8 du haut. Il ne se réduit pas avec la forme (sauf s'il ne tient pas en largeur : réduit jusqu'à 10, puis « … »).
  - **Texte du ticket** : la valeur de la forme, dans la zone sous le label (marges de 8, haut de la zone sous le
    label + 4), noir, qui remplit sa zone comme le Post-it (`fitText=fill` : agrandi ou réduit, 6 au minimum, puis
    « … ») ; double-clic dans la forme pour l'éditer, comme un post-it.
  - Changer le fond dans le panneau reste possible (le type ne change pas) ; le label suit le type, pas la couleur.
  - **Réglage de la page** « Labels » (Paramètres de la page, section du mode ; `spatial.es.labels`, coché par
    défaut) : décoché, aucun post-it de la page ne montre son label (aide pour débuter) et le texte prend toute la
    forme (marges de 8) ; une étape d'annulation ; l'export suit le réglage (pas de label en tête de valeur).
- **Contacts** (ce sur quoi les sujets suivants s'appuieront) :
  - **Aimantation bord à bord** : en déplaçant ou redimensionnant un post-it du mode, un bord à moins de 8 (écran)
    d'un bord parallèle d'un autre post-it du mode, qui se chevauchent sur l'autre axe, s'y colle exactement (écart
    0). Désactivée avec Alt maintenu, comme les autres aimantations.
  - **Lecture des contacts** : une fonction pure du mode, `contacts(page)`, donne pour chaque paire de post-it qui se
    touchent (bords à moins de 0,5 l'un de l'autre, chevauchement non nul sur l'autre axe ; un coin seul ne compte
    pas) : les deux formes, le **côté** de chacune (haut, bas, gauche, droite), et le **segment de contact** (début,
    fin, longueur, part du côté de chaque forme). Deux post-it qui se chevauchent sont signalés à part
    (« chevauchement »), pas comptés comme contact.
  - **Panneau d'un post-it** (section « Event storming », lecture seule) : la liste de ses contacts, « Command
    « Payer » — à gauche, sur tout le côté » / « … — en haut, sur 40 % », ou « Ne touche aucun post-it ».
- **Copier-coller** : rien de propre au mode (type et texte suivent).
- **Export draw.io** : chaque post-it s'exporte en rectangle de sa couleur à ombre, sans contour, le label en tête de
  la valeur (gras), le texte en dessous ; `spatial.kind` reste dans le style ; le fichier s'ouvre dans draw.io.
- Fixture `tests/fixtures/eventstorming.drawio` : un post-it de chaque type ; une ligne Acteur → Commande → Événement
  collés bord à bord ; une Politique collée sous un Événement sur la moitié de son côté ; deux post-it qui se
  touchent par un coin seul ; deux qui se chevauchent ; un Titre et un Texte.
- **Fini quand :** une page passée en mode Event storming propose les 8 post-it, Texte et Titre dans la palette ;
  chaque post-it montre son label en gras et feutre en haut et son texte dessous ; iso et 3D ne sont pas proposés
  sur la page ; approcher un post-it d'un autre le colle bord à bord (pas avec Alt) ; le panneau de la Commande de
  la fixture liste l'Acteur à gauche et l'Événement à droite, sur tout le côté, celui de la Politique « en haut,
  sur 50 % » ; le contact par un coin n'apparaît pas, le chevauchement est signalé ; décocher « Labels » dans les
  paramètres de la page retire les labels et le texte remonte, ⌘Z les remet ; l'export s'ouvre dans
  draw.io ; tests de `contacts` (côtés, segments, coin, chevauchement, tolérance), de l'aimantation et de la
  reconnaissance des types ; `make check` vert.
