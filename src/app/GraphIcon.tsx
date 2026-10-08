/** Icône de la vue graphe (onglet « Vue graphe », bouton du mode navigation) : nœud central à la couleur d'accent. */
export function GraphIcon() {
  return (
    <svg className="graph-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.3 7.1 11.3 3.8M5.2 9 9.5 11.4" />
      <circle cx="12.8" cy="3" r="1.7" />
      <circle cx="11.5" cy="12.5" r="2.3" />
      <circle className="graph-icon-hub" cx="3.5" cy="8" r="2" />
    </svg>
  );
}
