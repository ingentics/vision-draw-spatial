# Paramètres de la pastille : avec texte, sans texte

> Itération — paramètres (Modes › Séquences) ; reprise de 81

- Dans « Modes › Séquences », les réglages de la pastille propres à une flèche avec texte et à une flèche sans texte
  vont dans deux groupes à eux (« Pastille d'une flèche avec texte », « Pastille d'une flèche sans texte ») au lieu
  de la précision entre parenthèses ; le groupe « Pastilles » garde les réglages communs (bordure, chiffre).
- **Fini quand :** les libellés n'ont plus de parenthèses, chaque réglage est dans son groupe ; `make check` vert.
- Fait : `SettingsPanel.tsx` — groupe « Pastilles » (bordure, chiffre), puis « Pastille d'une flèche avec texte »
  (Rayon, Taille du chiffre, Écart avec le texte) et « Pastille d'une flèche sans texte » (Rayon, Taille du chiffre).
  Vérifié dans la fenêtre des paramètres.
