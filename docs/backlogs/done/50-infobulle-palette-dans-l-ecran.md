# Infobulle de la palette toujours dans l'écran

> Itération — palette de formes ; reprise de 49

- L'infobulle du nom d'une forme ne dépasse jamais de la fenêtre : centrée sous la forme par défaut, elle est
  décalée horizontalement pour rester à 4 px des bords, et passe au-dessus de la forme s'il n'y a pas la place en
  dessous.
- **Fini quand :** sur la forme la plus à gauche de la palette, l'infobulle reste entière dans la fenêtre ;
  `make check` vert.
- Fait : `src/app/Palette.tsx` (`tooltipPosition` : centrage sous la forme borné à 4 px des bords, bascule
  au-dessus si la place manque ; appliquée en `useLayoutEffect` une fois la taille de l'infobulle connue) et
  `src/app/main.css` (glissement en `translateY` seul). Vérifié dans l'appli : sur « Rectangle », l'infobulle centrée
  aurait commencé à −3 px, elle est décalée à 4 px du bord ; `make check` vert.
