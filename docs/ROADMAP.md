# Work organisation — Drawio Spatial

> Topics are not tracked in this file: it only describes how work is organised. Reference: `SPEC.md`.

## Backlogs

Each topic (feature, shape, fix, idea) is **one Markdown file** in `docs/backlogs/`: `idea/` (not specified yet),
`todo/` (to do or in progress), `done/` (finished), and `debt/` (debt noticed in passing).

- **An idea** (wish, lead, "if needed") goes to `idea/`, even as one line. When we decide to work on it, it is made
  precise (exact values, "Fini quand" criterion) and moves to `todo/` (`git mv`); it may also spawn several `todo/`
  topics, and the idea file is then deleted.
- **One topic = one file.** A topic too big is split into several files; a partly done topic is split: the done part
  goes to `done/`, the rest becomes a new `todo/` file.
- **When a topic is done, its file moves from `todo/` to `done/`** (`git mv`) in the same commit as the code, with
  what was done (files, choices, validation) added under a "Fait :" line. Behaviour changes, even minor
  (including from a refactor), are written there.
- A `done/` file is never modified afterwards: an evolution or rework is a new `todo/` topic.

### Naming

`NN-sujet-en-kebab-case.md` (French slug), where `NN` is a **unique number, never reused**: a new topic takes the
largest existing number + 1 (`idea/`, `todo/`, `done/` and `debt/` together: `ls docs/backlogs/*/`). The number is a
stable reference ("étape 24" in code and tests), not an order. Numbers 0 to 26 are the steps of the old roadmap.

### File content (written in French)

```markdown
# Titre du sujet

> Milestone ou thème de rattachement (ex. « Milestone 5 — Formes géométriques »), dépendances éventuelles

- Ce qu'on veut, avec les valeurs exactes (styles, tailles, attributs). Inutile de reprendre celles de draw.io.
- **Fini quand :** critère vérifiable, à l'œil dans l'appli.
- Fait : (ajouté une fois le sujet terminé) ce qui a été réalisé et comment c'est validé.
```

An `idea/` file may be just a title and one line.

## Iterations

An **iteration** is a small topic: a tweak, a setting, a fix on a precise part of the app. Same format, shorter.

- **Every change request becomes a ticket.** Even a one-sentence request in the conversation is first written as a
  `todo/` file (next number) before writing code; if it is ambiguous, clarify it before starting.
- An iteration concerns an already committed ticket. Otherwise we are still on the same ticket (amend it).
- A few lines: title, attachment (`> Itération — <partie de l'appli>`, plus the reworked topic if any, e.g. « reprise
  de 47 »), what changes, **Fini quand**.
- It ends like any topic: `make check` and, after validation, a commit moving the file to `done/` with its
  "Fait :" line (files touched, check in the app).
- Several small requests on the same part, done together, may share an iteration; unrelated requests each get
  their own.

## Principle

At every topic the app runs and the result can be checked by eye. draw.io is only an export target (topic 408): the
exported file must open in draw.io; nothing else has to match draw.io.
