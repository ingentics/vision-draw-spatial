---
name: audit
description: >-
  Audit qualité d'une base de code (extensibilité, mutualisation, responsabilités, patterns, lisibilité, docs) :
  constats vérifiés au fichier:ligne, triés, transformés en tickets validés par l'utilisateur, puis réalisés un par
  un sans changement de comportement. À utiliser quand l'utilisateur demande un audit, une revue d'architecture ou
  une passe de qualité sur tout ou partie d'un projet.
---

# Audit qualité d'une base de code

Procédure indépendante du projet. Tout ce qui lui est propre (chemins, commandes, format des tickets, langue,
règles de commit) se découvre à l'étape 0 et prime sur ce fichier. Les éléments entre `<…>` sont à remplir.

## 0. Découvrir le projet (avant toute analyse)

- **Instructions** : `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, règles de code (`.claude/rules/`, guides de style),
  `README`. En retenir : langue des docs et commentaires, conventions de commit, quand commiter, outils imposés
  (conteneur, gestionnaire de paquets).
- **Commande de vérification** (lint, types, format, tests) et façon de voir le résultat (serveur de dev, fixtures,
  démo). Ne jamais lancer un second serveur si le projet en partage un.
- **Système de tickets** : dossier de backlog, outil externe, ou rien. Format d'un ticket, règle de numérotation
  (prochain numéro libre), cycle de vie (idée → à faire → fait), emplacement de la dette.
- **Architecture** : docs de synthèse, carte des dossiers, guides « ajouter un … », points d'extension (plugins,
  registres, API publique), frontières vérifiées (lint, tests d'architecture).
- **Passes précédentes** : audits et tickets de refactor déjà faits, pour ne pas refaire le même constat.
- **Taille** : nombre de fichiers et de lignes par zone, plus gros fichiers (`wc -l`), pour calibrer le périmètre.

S'il manque une information bloquante (objectif, périmètre), la demander ; sinon prendre le défaut raisonnable et
le noter dans le fichier de suivi.

## 1. Cadrer

Rédiger le **fichier de suivi** (modèle en fin de document) à l'endroit où le projet range ses tâches ; à défaut
`docs/audits/AUDIT-<date>.md`. Il fixe :

- **Objectif** : la qualité visée, en une phrase vérifiable. Défaut : « ajouter une fonctionnalité au point
  d'extension prévu se fait sans toucher au tronc, en ne s'appuyant que sur l'API publique, dans un code où chaque
  fichier porte une seule responsabilité ».
- **Périmètre** : prioritaire (le cœur), secondaire (là où il compense un manque du cœur), docs à confronter au code.
- **Hors périmètre** : code porté ou généré, code tiers, et par défaut tout changement de comportement visible.

## 2. Axes d'analyse

Adapter la liste au projet ; chaque axe est une question à laquelle on répond par des constats situés.

1. **Découplage et extensibilité**
   - Le cœur connaît-il une extension par son nom (identifiant en dur, cas particulier, `switch` sur un type) ?
   - Une nouvelle extension doit-elle toucher autre chose que son propre dossier (liste à compléter, enregistrement
     manuel, table centrale) ?
   - L'API exposée aux extensions est-elle complète, minimale et cohérente ? Une extension la contourne-t-elle, la
     réimplémente-t-elle, reçoit-elle un objet vivant du cœur ? Les familles d'extensions suivent-elles le même
     patron (registre, appels protégés, lecture seule, diagnostics) ?
2. **Mutualisation** : calculs refaits à la main, variantes proches non paramétrées, tables ou constantes
   redéclarées, entre extensions comme entre modules du cœur.
3. **Responsabilité par fichier** : fichiers qui mêlent plusieurs sujets, modules qui écrivent l'état d'un autre,
   façade qui calcule au lieu de déléguer, logique pure enfermée dans un objet à état, fichiers mal placés.
4. **Bons patterns pour bons usages** : registre vs `switch`, événements vs appels directs, état de module mutable
   (partagé entre instances), héritage vs composition, garde commune vs cas particulier recopié, unions discriminées
   vs tests de forme.
5. **Lisibilité** : nommage, commentaires (le pourquoi, dans la langue du projet), code mort (exports et méthodes
   publiques sans appelant), fonctions et fichiers trop longs.
6. **Erreurs réelles** croisées en chemin : mutation d'un état censé être immuable, exception avalée, fuite. Elles
   passent en tête du tri.
7. **Docs** : guides et synthèses alignés sur le code, chemins cités qui existent, informations dupliquées en
   plusieurs copies, ce qui manque à un agent pour ajouter une extension sans lire le cœur.

## 3. Méthode

1. **Constat, en lecture seule.** Une exploration par axe (ou groupe d'axes), en parallèle avec des sous-agents si
   disponibles, chacun avec un périmètre et une consigne écrite : constats situés (`fichier:ligne`), avec un extrait
   ou un compte (« ≈ 40 occurrences »), et ce qui est sain. Puis **relire soi-même chaque constat dans le code** :
   aucune supposition, aucun constat de seconde main. Écarter ce qu'une passe précédente a déjà traité.
2. **Tri** par gain (erreurs réelles, puis extensibilité, puis le reste), risque et taille (S / M / L). La dette
   mineure va là où le projet range sa dette, une ligne par point.
3. **Tickets** : un ticket par chantier cohérent, au format du projet, contenant : constat (situé), ce qu'on veut,
   écart de comportement attendu (« aucun » sauf mention), tests à ajouter ou adapter, docs à mettre à jour,
   critère **Fini quand** vérifiable.
4. **Validation par l'utilisateur** de la liste des tickets et de l'ordre, avant d'écrire du code. S'arrêter ici
   et présenter le tableau des sujets.
5. **Réalisation**, ticket par ticket, dans l'ordre validé :
   - refactor sans changement de comportement : les tests existants restent intacts (seuls les imports bougent) ;
   - commande de vérification du projet verte (code de sortie lu avant tout commit) ;
   - vérification à l'œil dans l'application quand le projet le permet ; dire ce qui n'a été vérifié que par les
     tests ;
   - docs corrigées dans le même commit que le code qu'elles décrivent ;
   - commit selon les règles du projet (souvent : seulement après validation de l'utilisateur, fichiers ajoutés un
     par un) ; la dette vue en passant est notée, pas corrigée ;
   - cocher l'avancement dans le fichier de suivi.

## 4. Livrables

- Le fichier de suivi, complété des constats, du tableau des sujets et de l'avancement.
- Les tickets et les lignes de dette.
- Le code et les docs, un commit par ticket.
- Un bilan final : ce qui a été fait, ce qui reste (dette, sujets reportés), ce qui n'a été vérifié que par tests.

## Modèle du fichier de suivi

```markdown
# Audit qualité — <zone>, <n>e passe

> Lancé le <date>. Suite de <passes ou tickets précédents>. Ce fichier décrit la tâche et en suit l'avancement ;
> les constats deviennent des tickets.

## Objectif

<une phrase vérifiable>

## Périmètre

- **Prioritaire** : <dossiers, taille>
- **Secondaire** : <dossiers>
- **Docs** : <fichiers à confronter au code>
- **Hors périmètre** : <code porté, généré, tiers ; changements de comportement>

## Axes d'analyse

<axes retenus, adaptés au projet>

## Constats (<date>)

**Ce qui est sain** : <…>

**Erreurs réelles** : <constat> → <ticket>

**Ce qui freine l'extensibilité** : <constat> → <ticket>

**Mutualisation et responsabilités** : <constat> → <ticket>

**Docs** : <constat> → <ticket>

## Sujets

| #   | Sujet | Gain | Taille | Décision |
| --- | ----- | ---- | ------ | -------- |

Ordre suivi : <…>. Un commit par sujet, dès que la vérification est verte.

## Avancement

- [ ] Tâche décrite (ce fichier)
- [ ] Constats
- [ ] Sujets rédigés
- [ ] Sujets validés par l'utilisateur
- [ ] Réalisation
```
