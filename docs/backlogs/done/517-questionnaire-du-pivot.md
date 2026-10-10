# Questionnaire du pivot d'un Domain Event

> Itération — mode Event storming, reprise de 515 et 516 ; petit ajout au schéma commun des champs (391)

- La section « Pivot » d'un Domain Event remplace les quatre boutons par **deux questions** et un **encadré de
  verdict**. Le pivot reste enregistré (`spatial.es.pivot` : `1`, `0`, `unknown`, absent) et garde ses icônes (516) ;
  il est **déduit des réponses**, écrit à chaque réponse, plus choisi à la main.
- **Icône de Je ne sais pas** : un point d'interrogation remplace le triangle d'alerte, à la même place,
  centré dans le carré de 20 : crochet en arc de cercle prolongé sans cassure par une courbe jusqu'à la tige, trait
  de 1,6 (plus appuyé que le cube, pour se lire), point rond plein ; le cube de Oui ne change pas.
- **Question 1** « Qui réagit à cet événement sur le mur ? », aide « Regarde les policies et commandes qui
  suivent. » : Un autre métier, Le même métier, Personne, On ne sait pas (`spatial.es.pivotWho` : `other`, `same`,
  `none`, `unknown`).
- **Question 2**, selon la question 1 (rien pour On ne sait pas) :
  - Un autre métier : « Pour réagir, ont-ils besoin d'autre chose que l'événement ? », aide « Aller chercher une
    donnée chez le métier qui l'a produit, par exemple. » : Non, il suffit, Oui, On ne sait pas
    (`spatial.es.pivotNeeds` : `no`, `yes`, `unknown`) ;
  - Le même métier, Personne : « Un métier absent de l'atelier aurait-il besoin de le savoir ? », aide « Stock,
    compta, support, juridique… » : Oui, Non, On ne sait pas (`spatial.es.pivotAbsent` : `yes`, `no`, `unknown`).
  Chaque réponse a sa clé : changer la question 1 garde les réponses de l'autre branche.
- **Par défaut** (attribut absent), chaque question montre « On ne sait pas » enfoncé, sans rien écrire : le pivot
  reste Non défini et l'encadré dit « Non défini — Réponds aux questions pour qualifier l'événement. ». Cliquer une
  réponse, même « On ne sait pas » déjà enfoncé, l'écrit et calcule le pivot.
- **Verdicts** (« X » : texte du post-it) :

  | Q1 | Q2 | Encadré | Pivot | Hotspot |
  |---|---|---|---|---|
  | On ne sait pas | — | Incertain (orange) : On ne sait pas encore qui réagit à cet événement. | `unknown` | Qui réagit à « X » ? Regarder les policies et commandes qui suivent. |
  | Un autre métier | Non, il suffit | Pivot (bleu) : Un autre métier prend le relais avec l'événement seul. La frontière est propre. | `1` | — |
  | Un autre métier | Oui | Pivot à confirmer (rouge) : Un autre métier réagit mais dépend encore du métier qui l'a produit. | `unknown` | De quoi le métier qui réagit à « X » a-t-il besoin en plus ? L'ajouter à l'événement ou revoir la frontière. |
  | Un autre métier | On ne sait pas | Incertain (orange) : On ne sait pas si l'événement suffit à celui qui réagit. | `unknown` | Le métier qui réagit à « X » a-t-il besoin d'autre chose que l'événement ? |
  | Le même métier | Non | Pas pivot (gris) : Le même métier poursuit, personne d'autre n'en a besoin. | `0` | — |
  | Personne | Non | Pas pivot (gris) : Événement terminal : personne ne prend le relais. | `0` | — |
  | Le même métier, Personne | Oui | Pivot à confirmer (rouge) : Un consommateur existe mais il n'est pas sur le mur. | `1` | Quel métier absent de l'atelier réagit à « X » ? À inviter ou à interroger. |
  | Le même métier, Personne | On ne sait pas | Incertain (orange) : On ne sait pas si un métier absent en a besoin. | inchangé | Un autre métier a-t-il besoin de savoir que « X » ? |

  Une question 2 sans réponse vaut « On ne sait pas ». Sans texte sur le post-it, « X » devient « cet événement » ;
  les guillemets tiennent au texte (espaces insécables).
- **Encadré** sous les questions : fond teinté, titre gras coloré, phrase ; s'il y a un hotspot, un filet puis
  « HOTSPOT » en petit titre et la question. Tons : bleu (Pivot), gris (Pas pivot, Non défini), rouge (Pivot à
  confirmer), orange (Incertain). Un pivot écrit sans réponse (fichier d'avant) montre son verdict
  (Pivot, Pas pivot, Incertain) avec « Répondu sans les questions : reprends-les pour le confirmer. ».
- Les questions en boutons montrent leur aide entre la question (en gras) et les boutons.
- **Tronc** (schéma commun des champs) : champ `note`, encadré en lecture seule (ton, titre, texte, aparté titré),
  calculé pour la cible comme les choix d'un réglage de mode.
- **Fini quand :** un Domain Event neuf montre la question 1 sur « On ne sait pas », pas de question 2, l'encadré
  Non défini et pas d'icône ; Je ne sais pas montre le point d'interrogation ; chaque ligne du tableau donne son encadré, son pivot et son icône ; la question 2
  change avec la question 1 ; ⌘Z défait chaque réponse ; les autres post-it n'ont pas la section ; tests ;
  `make check` vert.
- Fait : `eventstorming/pivot/pivot.ts` (`PIVOT_PROPERTIES` : trois questions en boutons, masquées selon la branche,
  et l'encadré ; chaque réponse écrite recalcule `spatial.es.pivot`), `pivot/pivotVerdict.ts` (table des verdicts,
  pure), `pivot/pivotMark.ts` (point d'interrogation à la place du triangle, kind `question`) ; schéma commun : champ
  `note` (`FieldNote`, `fieldSchema.ts`), évalué pour la cible par `ModeProperty.note` (`modeProperty.ts`,
  `modePanel.ts`, `ModePropertyView.note`), rendu par `DeclaredField.tsx` (`field-note`, `main.css`) ; l'aide d'une
  question en boutons passe entre la question (en gras) et les boutons. Changement : le pivot ne se choisit plus à
  la main. Vérifié dans l'appli sur `eventstorming-commande.drawio` (Paiement refusé) : défaut Non défini sans icône,
  Personne puis Oui (Pivot à confirmer, cube, hotspot citant le post-it), Un autre métier puis Non (Pivot, bleu),
  Incertain et point d'interrogation, ⌘Z. Les autres lignes de la table par les tests : `pivot/pivot.test.ts`,
  `pivot/pivotVerdict.test.ts`, `pivot/pivotMark.test.ts`.
