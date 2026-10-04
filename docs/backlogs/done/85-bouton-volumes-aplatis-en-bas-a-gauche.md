# Bouton des volumes aplatis en bas à gauche, avec infobulle

> Itération — rendu iso / 3D (icône des volumes aplatis) ; reprise de 83

- L'icône des volumes aplatis passe en bas à gauche de la zone de dessin (12 px des bords), la mini-carte reste
  seule en bas à droite.
- Au survol (ou au focus clavier), une infobulle explique : « Volumes aplatis (V) » et « Cliquer pour les rétablir »,
  à la place de l'infobulle native du navigateur.
- **Fini quand :** en iso, après V, l'icône est en bas à gauche, son survol montre l'infobulle, un clic rétablit les
  volumes ; `make check` vert.
- Fait :
  - `DrawioSpatial.tsx` : l'icône `.drawio-flatten` est posée seule en bas à gauche (`left: 12, bottom: 12`) ; le
    regroupement `.drawio-corner` de 83 est retiré, la mini-carte reprend sa place seule en bas à droite.
  - Infobulle `.drawio-flatten-tooltip` (`drawio-spatial.css`) au-dessus de l'icône, au survol ou au focus clavier,
    avec un fondu ; couleurs par `--drawio-spatial-tooltip-bg` / `-fg` ; l'attribut `title` est retiré (pas de
    double infobulle), `aria-label` gardé.
  - Vérifié dans l'appli : en iso, après V, icône en bas à gauche, infobulle au survol.
