# Organisation du travail — Drawio Spatial

> Le suivi des sujets ne se fait plus dans ce fichier : il décrit seulement comment on s'organise.
> Référence fonctionnelle et technique : `SPEC.md`.

## Les backlogs

Chaque sujet (fonctionnalité, forme, correction, idée) est **un fichier Markdown** dans `docs/backlogs/` :

```
docs/backlogs/
├── idea/   idées pas encore précisées
├── todo/   sujets à traiter (ou en cours)
└── done/   sujets terminés
```

- **Une idée** (envie, piste, « si nécessaire ») va dans `idea/`, même en une ligne. Quand on décide de la traiter,
  on la précise (valeurs exactes, critère « Fini quand ») et elle passe en `todo/` (`git mv`) ; elle peut aussi
  donner naissance à plusieurs sujets `todo/`, et le fichier d'idée est alors supprimé.

- **Un sujet = un fichier.** Un sujet trop gros se découpe en plusieurs fichiers ; un sujet terminé en partie est
  scindé : la partie faite part en `done/`, le reste devient un nouveau fichier en `todo/`.
- **Quand un sujet est traité, son fichier passe de `todo/` à `done/`** (`git mv`), dans le même commit que le code.
  On y ajoute alors ce qui a été fait (fichiers, choix, validation dans draw.io), sous une ligne « Fait : ».
- Un fichier `done/` n'est plus modifié ensuite : une évolution ou une reprise est un nouveau sujet en `todo/`.

### Nommage

`NN-sujet-en-kebab-case.md`, où `NN` est un **numéro unique**, jamais réutilisé : un nouveau sujet prend le numéro
suivant le plus grand existant (`idea/`, `todo/` et `done/` confondus). Le numéro sert de référence stable (« étape 24 » dans
le code et les tests), il ne fixe pas l'ordre de traitement. Les numéros 0 à 26 reprennent les étapes de l'ancienne
feuille de route.

### Contenu d'un fichier

```markdown
# Titre du sujet

> Milestone ou thème de rattachement (ex. « Milestone 5 — Formes géométriques »), dépendances éventuelles

- Ce qu'on veut, avec les valeurs exactes de draw.io quand il y en a (styles, tailles, attributs).
- **Fini quand :** critère vérifiable, à l'œil dans l'appli et, si le fichier est touché, dans draw.io.
- Fait : (ajouté une fois le sujet terminé) ce qui a été réalisé et comment c'est validé.
```

Un fichier `idea/` peut se limiter au titre et à une ligne de description.

## Façon de travailler (phase de dev)

- Tout tourne dans Docker (Node figé par l'image) ; `make dev` lance l'appli et affiche le lien (SPEC §3.4).
- **Un seul serveur en hot reload** reste ouvert (`make dev`, port 5173) : on travaille directement dessus, il suffit
  de regarder ou de rafraîchir l'onglet. Une modification du moteur recharge la page en restaurant fichier, page et
  caméra.
- Principe : à chaque sujet, l'application tourne et on peut vérifier le résultat à l'œil.
- Ce qui touche au fichier draw.io se valide contre draw.io lui-même (`make drawio-check` : réenregistrement et export
  SVG des fixtures).
- Chaque sujet se termine par `make check` (lint, types, format, tests) et un commit qui inclut le déplacement du
  fichier en `done/` ; les pushes sont faits à la main.
