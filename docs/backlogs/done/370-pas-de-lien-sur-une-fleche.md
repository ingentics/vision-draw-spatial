# Pas de lien vers une page sur une flèche

> Itération — panneau latéral d'une flèche

- Le panneau d'une flèche n'a plus de section « Lien » (choix « Vers » une page ou une URL) : seules les formes
  portent un lien. Un lien déjà présent sur une flèche dans le fichier est conservé tel quel.
- **Fini quand :** en sélectionnant une flèche, le panneau ne montre plus la section « Lien » ; une forme la garde.
- Fait : section « Lien » retirée du panneau de la flèche (`src/app/ContextPanel.tsx`) ; lecture et écriture du
  fichier inchangées (un lien existant sur une flèche est conservé). Validé par `make check` et à l'œil dans l'appli.
