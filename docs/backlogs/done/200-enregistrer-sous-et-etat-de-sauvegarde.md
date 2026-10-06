# « Enregistrer sous » et état de la sauvegarde automatique

> Itération — barre d'outils (sauvegarde) ; reprise de la sauvegarde automatique (SPEC §14.1)

- Le bouton « Sauvegarder » s'appelle « Enregistrer sous » (libellé et infobulle).
- Sauvegarde automatique activée : petit texte gris à droite du bouton « Réinitialiser la vue » :
  « Saving... » tant qu'une modification attend ou est en cours d'écriture, « All changes saved » une fois écrite.
- Le bouton n’a plus de pastille ni de bordure bleue quand le fichier est modifié (le texte d’état suffit).
- **Fini quand :** le bouton affiche « Enregistrer sous » ; en modifiant une forme, « Saving... » apparaît puis
  « All changes saved » ; rien n'est affiché si la sauvegarde automatique est désactivée ; `make check` vert.
- Fait : `src/app/Viewer.tsx` (libellé et infobulle « Enregistrer sous », état `autosaving` le temps de
  l'écriture, texte `.save-status` après la barre de navigation, pastille et classe `modified` retirées),
  `src/app/main.css` (`.save-status` gris, compressible pour ne pas faire passer la barre à la ligne ; styles de
  pastille retirés), libellés dans `SettingsPanel.tsx` et SPEC §9 (raccourcis) et §14.1. Vérifié dans l'appli : déplacer une
  forme affiche « Saving... » puis « All changes saved ».
