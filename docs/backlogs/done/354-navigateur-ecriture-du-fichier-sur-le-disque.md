# Navigateur : enregistrer aussi le fichier sur le disque

> Itération — sauvegarde dans le navigateur (SPEC §5, §14.1)

- Dans le navigateur (Chrome, Edge : API File System Access), un fichier ouvert par « Ouvrir un fichier… »
  (`showOpenFilePicker`) ou glissé-déposé (`getAsFileSystemHandle`) garde son accès au fichier, mémorisé avec lui
  dans la bibliothèque (il survit au rechargement et à la réouverture depuis les récents).
- Sauvegarde manuelle (bouton, Ctrl+S) et automatique : le fichier est réécrit sur le disque, en plus de la
  bibliothèque ; plus de téléchargement pour ces fichiers (le bouton devient « Enregistrer »).
- Sans autorisation d'écrire (après un rechargement, ou refusée) : un petit avertissement apparaît dans la barre
  d'outils ; un clic demande l'autorisation, puis enregistre le contenu courant. La sauvegarde manuelle la demande
  aussi directement. En attendant, la sauvegarde automatique ne va que dans la bibliothèque.
- Garde-fou : si le fichier a été modifié sur le disque depuis son ouverture (ex. dans draw.io), il n'est pas
  écrasé : message d'erreur.
- Navigateurs sans l'API (Firefox, Safari) : comportement inchangé (bibliothèque, téléchargement à « Enregistrer
  sous »).
- **Fini quand :** sur `localhost:5173` dans Chrome, un fichier ouvert depuis le sélecteur puis modifié est réécrit
  sur le disque (rouvert dans draw.io, il montre la modification) ; après un rechargement, l'avertissement apparaît
  et un clic dessus rétablit l'écriture.
- Fait : `src/app/diskFile.ts` (sélecteur `showOpenFilePicker`, accès d'un glisser-déposer, autorisation,
  écriture avec garde-fou sur la date de modification), champ `disk` de `StoredFile` (accès mémorisé dans
  IndexedDB), `importFile`/`openFromPicker` (`fileLibrary.ts`), dépôt dans `App.tsx`, sauvegarde et
  avertissement « ⚠ Écriture sur le disque non autorisée » dans `Viewer.tsx` (bouton « Enregistrer » sans
  téléchargement pour ces fichiers), texte d'aide des paramètres. Un fichier rouvert par le simple sélecteur
  (sans l'API) oublie l'accès mémorisé. Tests : `tests/app/diskFile.test.ts`. Validé à l'œil dans Chrome par
  l'utilisateur.
