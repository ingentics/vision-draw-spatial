# Aide de l'ancrage des flèches en liste

> Itération — paramètres (formes et flèches) ; reprise de 186

- Page « Formes et flèches › Ancrage » : le commentaire sous « Ancrage des flèches » devient une énumération, une
  ligne par ancrage (Manuel, Automatique, Typon), puis une ligne pour le réglage propre à une page.
- **Fini quand :** la page Ancrage montre les trois ancrages en liste ; `make check` vert.
- Fait : `SettingsPanel.tsx`, liste à puces (nom de l'ancrage en gras) puis une ligne pour le réglage d'une page ;
  classe `.hint-list` dans `main.css`. Vérifié dans l'appli, page Formes et flèches › Ancrage.
