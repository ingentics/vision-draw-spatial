# Garanties des points d'entrée des modes

> Architecture du moteur — étanchéité des plugins. Version légère de l'idée « contrat des modes regroupé » (décidé le
> 2026-10-07) : les noms du contrat ne changent pas ; le regroupement par thème reste une idée (295).

- Une section de `docs/AJOUTER_UN_MODE.md` donne, pour chaque membre de `PageModeDefinition` (32 aujourd'hui), ce que
  le moteur garantit :
  - quand il l'appelle (geste, lecture, rendu…) ;
  - quelle page il reçoit (avant ou après les écritures du geste) ;
  - dans quelle étape d'annulation tombent ses écritures ;
  - ce qui se passe s'il lève une exception (repli du sujet 288).
- Les membres sont rangés par thème dans la table (déclaration, cycle de vie, rendu, flèches, formes et gestes,
  parties, courant, réglages), sans toucher au code.
- Un test vérifie que chaque membre de `PageModeDefinition` a sa ligne dans la table : un point d'entrée ajouté sans
  garantie écrite fait échouer `make check`.
- **Fini quand :** la table couvre les 32 membres, ses garanties correspondent aux appels de `core/domains/modes/`
  (relecture) ; le test passe et échoue si on retire une ligne (vérifié puis remis) ; `make check` vert.
- Fait :
  - `docs/AJOUTER_UN_MODE.md`, nouvelle section 8 « Garanties du moteur » :
    - les règles communes (opération, remise en ordre, panne, annuler / rétablir) ;
    - une table des 32 membres de `PageModeDefinition`, rangés par thème (déclaration, cycle de vie, rendu, flèches,
      formes et gestes, parties, courant, réglages déclarés), avec pour chacun : quand le moteur l'appelle, la page
      reçue, où tombent ses écritures, et le repli en cas de panne.

    La section 2 y renvoie. Aucun nom du contrat ne change.
  - Garanties relues contre les appels de `core/domains/modes/` et des gestes. Un écart trouvé : `allowsEffect` n'est
    pas protégé (appelé par le registre, depuis la scène et le panneau). La table le dit, et c'est noté en dette (296).
  - Test `tests/engine/core/modes/contractDoc.test.ts` : les membres lus dans la déclaration de `PageModeDefinition`
    doivent être exactement ceux de la table. Vérifié qu'il échoue sans la ligne `obstacles`, puis ligne remise.
  - Le regroupement du contrat par thème reste une idée (295), à faire quand un troisième mode arrive.
  - Validation : `make check` vert (110 fichiers, 2047 tests). Documentation seule, rien à vérifier dans l'appli.
