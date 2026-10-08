# Réglages de la vue graphe : valeurs par défaut, mini-graphe

> Itération — vue graphe (SPEC §12, §13), reprise de 367 et 366

- Nouvelles valeurs par défaut : `graph.nodeSize` 64 (inchangé), `graph.nodeGap` **50** (au lieu de 40),
  `graph.layerGap` **20** (au lieu de 80), `graph.transitionMs` **0** (au lieu de 50 : passage direct, sans
  animation), `graph.pairOffset` **15** (au lieu de 16). Bornes inchangées.
- La case « Afficher le mini-graphe (à gauche de la mini-carte, de sa largeur) » quitte la section « Mini-carte » pour
  Paramètres › Liens entre pages › **Vue graphe**, en tête de la sous-section. Clé `minigraph.visible` inchangée.
- SPEC §12 et §13 mises à jour.
- **Fini quand :** Paramètres › Liens entre pages › Vue graphe commence par la case du mini-graphe (absente de
  « Mini-carte ») et affiche ces valeurs après « Réinitialiser » ; la vue graphe a des rangées serrées et le passage
  graphe ↔ page est immédiat.
- Fait : défauts dans `settings/schema/view.ts` et `DEFAULT_GRAPH_LAYOUT` (`graph/graphPage.ts`), test
  `settings.test.ts` ; case du mini-graphe déplacée en tête de la sous-section « Vue graphe » (`SettingsPanel.tsx`) ;
  SPEC §12, §13. Vu dans l'appli : la case est en tête de Liens entre pages › Vue graphe et absente de « Mini-carte » ;
  les nouveaux défauts s'appliquent une fois retirées les valeurs figées par l'ancienne sauvegarde (sujet 364).
