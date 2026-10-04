# Renommer le flux courant depuis la barre

> Itération — mode Séquences (barre du flux courant) ; reprise de 80

- Cliquer le titre du flux dans la barre en haut de la zone de dessin le rend modifiable sur place ; Entrée ou
  quitter le champ valide, Échap annule. Une étape d’annulation (« Renommage »).
- Un titre vide (ou fait d'espaces) est refusé : le titre précédent revient.
- Cadre générique : le mode peut renommer son courant (`ModeCurrent.rename`) ; le moteur l'expose
  (`renameModeCurrent`, `ModeIndicator.renamable`).
- **Fini quand :** sur `sequences.drawio`, cliquer « Connexion » dans la barre, taper un nouveau nom et Entrée
  renomme le flux (barre et panneau) ; vider le champ remet l'ancien nom ; `make check` vert.
- Fait :
  - Composant commun `app/InlineEdit.tsx` : texte affiché dans un bouton, champ au clic ou au double-clic, Entrée ou
    quitter le champ valide, Échap annule, valeur vide ou inchangée non transmise. Utilisé par la barre du flux
    (`ModeBar.tsx`, clic) et par les onglets de page (`PageTabs.tsx`, double-clic, qui avaient leur propre champ).
  - Cadre : `ModeCurrent.rename` ; moteur : `renameModeCurrent` (« Renommage », une étape d'annulation),
    `ModeIndicator.renamable` (page modifiable et mode qui sait renommer). Séquences : `renameFlow`.
  - Styles `.mode-bar-label.renamable`, `.mode-bar-input` (`main.css`). Test (`sequences.test.ts`). Doc :
    `AJOUTER_UN_MODE.md`, SPEC §14.5.
  - Vérifié dans l'appli sur `sequences.drawio` : « Connexion » renommé depuis la barre (barre et panneau suivent,
    « Annuler : Renommage »), titre vidé refusé, remis à « Connexion » ; onglet de page : double-clic ouvre le
    champ, Échap annule.
