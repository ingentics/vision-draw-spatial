# Panneaux latéraux escamotés en douceur vers et depuis la vue graphe

> Itération — panneaux latéraux (reprise de 360), transitions de la vue graphe (SPEC §12)

- **Vers la vue graphe** (onglet « Vue graphe », touche G, bouton du mode navigation) : la barre gauche « Formes » et
  la barre droite ne disparaissent plus d'un coup. Elles glissent rapidement hors de l'écran, chacune vers son bord,
  au tout début de la transition (page qui rétrécit dans son nœud). La zone de dessin s'élargit pendant ce temps.
- **Depuis la vue graphe** (plongée dans un nœud) : effet inverse. Les deux barres reviennent en glissant depuis leur
  bord, avec la largeur et l'état replié qu'elles avaient, pendant que la page prend l'écran.
- Durée 200 ms, en ease-out, bien plus courte que la transition de la caméra. Pas d'animation
  si le mouvement réduit est demandé (`reducedMotion`) : les barres apparaissent et disparaissent d'un coup, comme
  aujourd'hui.
- **Seulement** pour les passages page ↔ vue graphe. Le passage d'une page à une autre, le repli d'une barre par son
  bouton et le redimensionnement ne changent pas.
- L'élargissement de la zone de dessin ne doit faire ni saut ni recadrage visible de la caméra pendant la transition.
- **Fini quand :** dans l'appli, sur une fixture à plusieurs pages (`fixtures/parent-pages.drawio`), ouvrir la vue
  graphe fait glisser les deux barres hors de l'écran sans saut de la page qui rétrécit, et la plongée dans un nœud
  les fait revenir en glissant. Passer d'une page à une autre ne les anime pas.
- Fait : `src/app/Sidebar.tsx` prend un glissement `slide` (`in`/`out`) : marge négative de la largeur de la barre (ou
  de sa bande repliée) animée en 200 ms ease-out (Web Animations), la zone de dessin suivant la place libérée ou
  prise ; `out` reste appliqué jusqu'au retrait de la barre. `src/app/Viewer.tsx` le déclenche sur `transitionStart`
  quand la page d'arrivée ou de départ est la vue graphe, et l'arrête sur `transitionEnd` ; pendant une plongée, les
  barres (palette active, panneau de droite) sont déjà celles de la page d'arrivée. `.viewport.sliding` rogne les
  barres au bord pendant le glissement (`src/app/main.css`). Sans transition (désactivée, mouvement réduit), rien ne
  change : pas d'événement de transition, les barres apparaissent d'un coup. La caméra garde son centre quand la zone
  de dessin change de largeur : pas de saut. Vérifié à l'œil dans l'appli (`fixtures/parent-pages.drawio`) : la
  marge passe de 0 à −208/−380 px en 200 ms à l'ouverture de la vue graphe, et de −208/−380 à 0 à la plongée dans un
  nœud.
